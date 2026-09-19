import type { YearlyTaxRates } from '../data/tax-rates';

export type PaymentsPerYear = 12 | 14;
export type Region = 'vienna' | 'restOfAustria';

export interface GrossNetInput {
  grossMonthly: number;
  paymentsPerYear: PaymentsPerYear;
  region: Region;
}

export interface LineItem {
  label: string;
  amount: number;
}

export interface SpecialPaymentResult {
  configured: boolean;
  /** 13th + 14th salary combined for the calendar year (assumes both equal one month's gross). */
  combinedGrossAnnual: number;
  socialInsuranceAnnual: number;
  wageTaxAnnual: number;
  netAnnual: number;
  /** netAnnual / 2, i.e. what one of the two payments nets out to on average. */
  netPerPaymentEstimate: number;
  steps: string[];
}

export interface GrossNetResult {
  configured: boolean;
  grossMonthly: number;
  netMonthly: number;
  socialInsuranceMonthly: number;
  wageTaxMonthly: number;
  socialInsuranceBreakdown: LineItem[];
  steps: string[];
  /** Present when paymentsPerYear is 14: the 13th/14th salary is taxed and capped differently from a regular month. */
  specialPayment?: SpecialPaymentResult;
}

const isSet = (n: number | null | undefined): n is number => n !== null && n !== undefined && !Number.isNaN(n);

export function formatEUR(n: number): string {
  return new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR' }).format(n);
}

function progressiveTax(annualTaxable: number, brackets: YearlyTaxRates['incomeTax']['brackets']): number {
  let tax = 0;
  let from = 0;
  for (const bracket of brackets) {
    if (!isSet(bracket.rate) || (bracket.upTo !== null && !isSet(bracket.upTo))) return NaN;
    const upper = bracket.upTo === null ? Infinity : bracket.upTo;
    if (annualTaxable > from) {
      tax += (Math.min(annualTaxable, upper) - from) * bracket.rate;
    }
    from = upper;
  }
  return tax;
}

function avRateFor(grossAmount: number, avBands: YearlyTaxRates['socialInsurance']['avBands']): number {
  for (const band of avBands) {
    if (band.upToMonthlyGross === null || grossAmount <= band.upToMonthlyGross) {
      return band.rate;
    }
  }
  return NaN;
}

function wbfRateFor(region: Region, si: YearlyTaxRates['socialInsurance']): number {
  return region === 'vienna' ? si.wohnbaufoerderungsbeitragRateVienna : si.wohnbaufoerderungsbeitragRate;
}

/** Social insurance on a regular month: PV + KV + AV + Kammerumlage + WBF, capped at the monthly ceiling. */
function socialInsuranceForRegularMonth(
  grossMonthly: number,
  region: Region,
  si: YearlyTaxRates['socialInsurance'],
): { total: number; breakdown: LineItem[] } {
  const avRate = avRateFor(grossMonthly, si.avBands);
  const wbfRate = wbfRateFor(region, si);
  const ceiling = si.monthlyContributionCeiling;

  if (!isSet(ceiling) || !isSet(avRate) || !isSet(wbfRate)) {
    return {
      total: NaN,
      breakdown: [
        { label: 'Pensionsversicherung', amount: NaN },
        { label: 'Krankenversicherung', amount: NaN },
        { label: 'Arbeitslosenversicherung', amount: NaN },
        { label: 'Kammerumlage (AK-Umlage)', amount: NaN },
        { label: 'Wohnbauförderungsbeitrag', amount: NaN },
      ],
    };
  }

  const base = Math.min(grossMonthly, ceiling);
  const breakdown: LineItem[] = [
    { label: 'Pensionsversicherung', amount: base * si.pensionsversicherungRate },
    { label: 'Krankenversicherung', amount: base * si.krankenversicherungRate },
    { label: 'Arbeitslosenversicherung', amount: base * avRate },
    { label: 'Kammerumlage (AK-Umlage)', amount: base * si.kammerumlageRate },
    { label: 'Wohnbauförderungsbeitrag', amount: base * wbfRate },
  ];
  const total = breakdown.reduce((sum, l) => sum + l.amount, 0);
  return { total, breakdown };
}

/** Social insurance on the combined annual Sonderzahlungen: PV + KV + AV only (no Kammerumlage or WBF), capped at the annual aggregate ceiling. */
function socialInsuranceForSonderzahlungen(
  combinedGrossAnnual: number,
  grossMonthly: number,
  si: YearlyTaxRates['socialInsurance'],
): number {
  const avRate = avRateFor(grossMonthly, si.avBands);
  const ceiling = si.sonderzahlungenAnnualContributionCeiling;
  if (!isSet(ceiling) || !isSet(avRate)) return NaN;
  const base = Math.min(combinedGrossAnnual, ceiling);
  return base * (si.pensionsversicherungRate + si.krankenversicherungRate + avRate);
}

/**
 * Tax on the Sonderzahlungen tax base under § 67 EStG: skip entirely
 * below the Freigrenze; otherwise slice the base (capped at the
 * Jahressechstel) through the progressive rate bands, and route any
 * excess above the Jahressechstel or above the top rate band through
 * the normal progressive tariff, stacked on top of regular annual
 * taxable income.
 */
function sonderzahlungenTax(
  taxableBase: number,
  jahressechstel: number,
  sz: YearlyTaxRates['sonderzahlungen'],
  brackets: YearlyTaxRates['incomeTax']['brackets'],
  annualRegularTaxable: number,
): number {
  if (!isSet(sz.freigrenze) || !isSet(jahressechstel)) return NaN;
  if (jahressechstel <= sz.freigrenze) return 0;

  const cappedBase = Math.min(taxableBase, jahressechstel);
  let tax = 0;
  let from = 0;
  for (const band of sz.rateBands) {
    if (!isSet(band.upToCumulative) || !isSet(band.rate)) return NaN;
    if (cappedBase > from) {
      tax += (Math.min(cappedBase, band.upToCumulative) - from) * band.rate;
    }
    from = band.upToCumulative;
  }

  const excessAboveBands = Math.max(0, cappedBase - from);
  const excessAboveJahressechstel = Math.max(0, taxableBase - jahressechstel);
  const sechstelueberhang = excessAboveBands + excessAboveJahressechstel;

  if (sechstelueberhang > 0) {
    if (!isSet(annualRegularTaxable)) return NaN;
    const taxWithExcess = progressiveTax(annualRegularTaxable + sechstelueberhang, brackets);
    const taxWithoutExcess = progressiveTax(annualRegularTaxable, brackets);
    if (!isSet(taxWithExcess) || !isSet(taxWithoutExcess)) return NaN;
    tax += taxWithExcess - taxWithoutExcess;
  }

  return tax;
}

/**
 * Estimates net pay from gross pay for a standard ASVG-insured
 * private-sector employee. See docs/AUSTRIA-TAX-DATA-2026.md for the
 * scope and every figure this draws on. Out of scope: self-employed,
 * civil servants, church tax, benefits in kind, overtime allowances,
 * apprentices, marginal employment, and Bundesland differences other
 * than the Vienna Wohnbauförderungsbeitrag rate.
 */
export function calculateGrossToNet(input: GrossNetInput, rates: YearlyTaxRates): GrossNetResult {
  const { grossMonthly, paymentsPerYear, region } = input;
  const steps: string[] = [];

  const sv = socialInsuranceForRegularMonth(grossMonthly, region, rates.socialInsurance);

  steps.push(
    isSet(sv.total)
      ? `Social insurance and payroll levies: ${(rates.socialInsurance.pensionsversicherungRate * 100).toFixed(2)}% Pensionsversicherung + ${(rates.socialInsurance.krankenversicherungRate * 100).toFixed(2)}% Krankenversicherung + Arbeitslosenversicherung (staggered by income) + 0.50% Kammerumlage + Wohnbauförderungsbeitrag, on the lower of your gross salary and the monthly contribution ceiling (${formatEUR(rates.socialInsurance.monthlyContributionCeiling)}).`
      : 'Social insurance: cannot calculate yet. A required rate has not been verified (TODO_VERIFY).',
  );

  const taxableMonthly = isSet(sv.total) ? grossMonthly - sv.total : NaN;
  const annualTaxableBeforeDeduction = isSet(taxableMonthly) ? taxableMonthly * 12 : NaN;
  const annualTaxableRegular = isSet(annualTaxableBeforeDeduction)
    ? annualTaxableBeforeDeduction - rates.incomeTax.werbungskostenpauschaleAnnual
    : NaN;

  steps.push(
    isSet(annualTaxableRegular)
      ? `Annual taxable income (12 regular months): (${formatEUR(grossMonthly)} − ${formatEUR(sv.total)} social insurance) × 12, minus the ${formatEUR(rates.incomeTax.werbungskostenpauschaleAnnual)} standard deduction (Werbungskostenpauschale) = ${formatEUR(annualTaxableRegular)}.`
      : 'Annual taxable income: cannot calculate until social insurance is known.',
  );

  const annualTaxBeforeCredits = isSet(annualTaxableRegular) ? progressiveTax(annualTaxableRegular, rates.incomeTax.brackets) : NaN;
  const credit = rates.automaticAllowances.verkehrsabsetzbetrag.amount;
  const annualTax = isSet(annualTaxBeforeCredits) && isSet(credit) ? Math.max(0, annualTaxBeforeCredits - credit) : NaN;
  const wageTaxMonthly = isSet(annualTax) ? annualTax / 12 : NaN;

  steps.push(
    isSet(annualTaxBeforeCredits)
      ? `Annual wage tax before credits: this year's tax brackets applied to ${formatEUR(annualTaxableRegular)} = ${formatEUR(annualTaxBeforeCredits)}.`
      : "Annual wage tax: cannot calculate yet. This year's tax brackets have not been verified (TODO_VERIFY).",
  );
  steps.push(
    isSet(credit)
      ? `Verkehrsabsetzbetrag credit: −${formatEUR(credit)} a year, spread evenly across 12 months.`
      : 'Verkehrsabsetzbetrag: cannot calculate yet (TODO_VERIFY).',
  );

  const netMonthly = isSet(sv.total) && isSet(wageTaxMonthly) ? grossMonthly - sv.total - wageTaxMonthly : NaN;

  const result: GrossNetResult = {
    configured: isSet(netMonthly) && isSet(sv.total) && isSet(wageTaxMonthly),
    grossMonthly,
    netMonthly,
    socialInsuranceMonthly: sv.total,
    wageTaxMonthly,
    socialInsuranceBreakdown: sv.breakdown,
    steps,
  };

  if (paymentsPerYear === 14) {
    const specialSteps: string[] = [];
    const combinedGrossAnnual = grossMonthly * 2;

    specialSteps.push(
      `Combined 13th + 14th salary for the year: 2 × ${formatEUR(grossMonthly)} = ${formatEUR(combinedGrossAnnual)}.`,
    );

    const svSpecial = socialInsuranceForSonderzahlungen(combinedGrossAnnual, grossMonthly, rates.socialInsurance);
    specialSteps.push(
      isSet(svSpecial)
        ? `Social insurance on Sonderzahlungen (Pensionsversicherung + Krankenversicherung + Arbeitslosenversicherung only — no Kammerumlage or Wohnbauförderungsbeitrag on special payments), on the lower of ${formatEUR(combinedGrossAnnual)} and the annual Sonderzahlungen ceiling (${formatEUR(rates.socialInsurance.sonderzahlungenAnnualContributionCeiling)}): ${formatEUR(svSpecial)}.`
        : 'Social insurance on Sonderzahlungen: cannot calculate yet (TODO_VERIFY).',
    );

    const taxableSpecial = isSet(svSpecial) ? combinedGrossAnnual - svSpecial : NaN;
    const afterFreibetrag = isSet(taxableSpecial)
      ? Math.max(0, taxableSpecial - rates.sonderzahlungen.annualFreibetrag)
      : NaN;
    const jahressechstel = grossMonthly * 2;

    specialSteps.push(
      isSet(afterFreibetrag)
        ? `Tax base: ${formatEUR(taxableSpecial)} minus the ${formatEUR(rates.sonderzahlungen.annualFreibetrag)} annual Freibetrag = ${formatEUR(afterFreibetrag)}. Jahressechstel: ${formatEUR(jahressechstel)}.`
        : 'Tax base for Sonderzahlungen: cannot calculate until social insurance is known.',
    );

    const wageTaxSpecial = isSet(afterFreibetrag)
      ? sonderzahlungenTax(afterFreibetrag, jahressechstel, rates.sonderzahlungen, rates.incomeTax.brackets, annualTaxableRegular)
      : NaN;

    if (isSet(jahressechstel) && isSet(rates.sonderzahlungen.freigrenze) && jahressechstel <= rates.sonderzahlungen.freigrenze) {
      specialSteps.push(`Jahressechstel is at or below the Freigrenze (${formatEUR(rates.sonderzahlungen.freigrenze)}), so no tax is due on Sonderzahlungen.`);
    } else {
      specialSteps.push(
        isSet(wageTaxSpecial)
          ? `Wage tax on Sonderzahlungen, applying the § 67 EStG rate bands (0% / 6% / 27% / 35.75%): ${formatEUR(wageTaxSpecial)}.`
          : "Wage tax on Sonderzahlungen: cannot calculate yet. The § 67 rate bands have not been verified (TODO_VERIFY).",
      );
    }

    const netAnnual = isSet(svSpecial) && isSet(wageTaxSpecial) ? combinedGrossAnnual - svSpecial - wageTaxSpecial : NaN;

    result.specialPayment = {
      configured: isSet(svSpecial) && isSet(wageTaxSpecial) && isSet(netAnnual),
      combinedGrossAnnual,
      socialInsuranceAnnual: svSpecial,
      wageTaxAnnual: wageTaxSpecial,
      netAnnual,
      netPerPaymentEstimate: isSet(netAnnual) ? netAnnual / 2 : NaN,
      steps: specialSteps,
    };
  }

  return result;
}
