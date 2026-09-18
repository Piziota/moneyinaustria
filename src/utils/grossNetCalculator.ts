import type { YearlyTaxRates } from '../data/tax-rates';

export type PaymentsPerYear = 12 | 14;

export interface GrossNetInput {
  grossMonthly: number;
  paymentsPerYear: PaymentsPerYear;
}

export interface LineItem {
  label: string;
  amount: number;
}

export interface SpecialPaymentResult {
  configured: boolean;
  grossPerPayment: number;
  socialInsurance: number;
  wageTax: number;
  netPerPayment: number;
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
  /** Present when paymentsPerYear is 14: the 13th/14th salary is taxed differently from a regular month. */
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

function socialInsuranceFor(
  grossAmount: number,
  ceiling: number,
  contributions: YearlyTaxRates['socialInsurance']['employeeContributions'],
): { total: number; breakdown: LineItem[] } {
  if (!isSet(ceiling)) {
    return {
      total: NaN,
      breakdown: contributions.map((c) => ({ label: c.label, amount: NaN })),
    };
  }
  const base = Math.min(grossAmount, ceiling);
  const breakdown = contributions.map((c) => ({
    label: c.label,
    amount: isSet(c.employeeRate) ? base * c.employeeRate : NaN,
  }));
  const total = breakdown.reduce((sum, l) => (isSet(sum) && isSet(l.amount) ? sum + l.amount : NaN), 0);
  return { total, breakdown };
}

function totalAutomaticCredits(rates: YearlyTaxRates): number {
  return rates.automaticAllowances.reduce(
    (sum, a) => (isSet(sum) && isSet(a.amount) ? sum + (a.amount as number) : NaN),
    0,
  );
}

/**
 * Estimates net pay from gross pay for a standard ASVG-insured private
 * sector employee. This is a simplified model, not a payroll-grade
 * calculation: see the notes on `sonderzahlungen` and
 * `specialPaymentContributionCeiling` in tax-rates.ts for known
 * simplifications around the 13th/14th salary.
 */
export function calculateGrossToNet(input: GrossNetInput, rates: YearlyTaxRates): GrossNetResult {
  const { grossMonthly, paymentsPerYear } = input;
  const steps: string[] = [];

  const sv = socialInsuranceFor(
    grossMonthly,
    rates.socialInsurance.monthlyContributionCeiling,
    rates.socialInsurance.employeeContributions,
  );

  steps.push(
    isSet(rates.socialInsurance.monthlyContributionCeiling)
      ? `Social insurance base: the lower of your gross salary and the monthly contribution ceiling (${formatEUR(rates.socialInsurance.monthlyContributionCeiling)}).`
      : 'Social insurance base: cannot calculate yet. The monthly contribution ceiling has not been verified (TODO_VERIFY).',
  );

  const taxableMonthly = isSet(sv.total) ? grossMonthly - sv.total : NaN;
  const annualTaxableRegular = isSet(taxableMonthly) ? taxableMonthly * 12 : NaN;

  steps.push(
    isSet(taxableMonthly)
      ? `Monthly taxable income: gross salary minus social insurance = ${formatEUR(taxableMonthly)}.`
      : 'Monthly taxable income: cannot calculate until social insurance is known.',
  );

  const annualTaxBeforeCredits = isSet(annualTaxableRegular)
    ? progressiveTax(annualTaxableRegular, rates.incomeTax.brackets)
    : NaN;
  const credits = totalAutomaticCredits(rates);
  const annualTax = isSet(annualTaxBeforeCredits) && isSet(credits) ? Math.max(0, annualTaxBeforeCredits - credits) : NaN;
  const wageTaxMonthly = isSet(annualTax) ? annualTax / 12 : NaN;

  steps.push(
    isSet(annualTaxBeforeCredits)
      ? `Annual wage tax on 12 regular months: this year's tax brackets applied to ${formatEUR(annualTaxableRegular)} of annual taxable income = ${formatEUR(annualTaxBeforeCredits)}.`
      : "Annual wage tax: cannot calculate yet. This year's tax brackets have not been verified (TODO_VERIFY).",
  );
  steps.push(
    isSet(credits)
      ? `Automatic tax credits applied: ${formatEUR(credits)} a year, spread evenly across 12 months.`
      : 'Automatic tax credits: cannot calculate yet. Not all automatic allowances have been verified (TODO_VERIFY).',
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
    const ceiling = isSet(rates.socialInsurance.specialPaymentContributionCeiling)
      ? rates.socialInsurance.specialPaymentContributionCeiling
      : rates.socialInsurance.monthlyContributionCeiling;
    const specialSv = socialInsuranceFor(grossMonthly, ceiling, rates.socialInsurance.employeeContributions);

    specialSteps.push(
      isSet(ceiling)
        ? `Social insurance on this payment: the lower of your gross salary and the special-payment contribution ceiling (${formatEUR(ceiling)}).`
        : 'Social insurance on this payment: cannot calculate yet. The special-payment contribution ceiling has not been verified (TODO_VERIFY).',
    );

    const taxableSpecial = isSet(specialSv.total) ? grossMonthly - specialSv.total : NaN;
    const sz = rates.sonderzahlungen;
    let specialTax = NaN;

    if (isSet(taxableSpecial) && isSet(sz.annualTaxFreeAllowance) && isSet(sz.flatRate)) {
      // Simplification: this treats each of the year's two special
      // payments (13th and 14th salary) as getting half of the annual
      // tax-free allowance. See the note on `sonderzahlungen` in
      // tax-rates.ts for why this is an approximation, not an official
      // formula.
      const perPaymentAllowance = sz.annualTaxFreeAllowance / 2;
      const taxableAfterAllowance = Math.max(0, taxableSpecial - perPaymentAllowance);
      specialTax = taxableAfterAllowance * sz.flatRate;

      specialSteps.push(
        `Wage tax on this payment: ${formatEUR(taxableSpecial)} taxable, minus a ${formatEUR(perPaymentAllowance)} tax-free allowance, taxed at a flat ${(sz.flatRate * 100).toFixed(1)}% = ${formatEUR(specialTax)}.`,
      );

      if (isSet(sz.favorableRateCeiling) && taxableAfterAllowance > sz.favorableRateCeiling - perPaymentAllowance) {
        specialSteps.push(
          'Note: this payment is large enough that part of it may fall outside the favorable flat-rate treatment. This calculator does not model that higher-rate portion, so its estimate for this payment will run low.',
        );
      }
    } else {
      specialSteps.push(
        "Wage tax on this payment: cannot calculate yet. The 13th/14th salary tax treatment has not been verified (TODO_VERIFY).",
      );
    }

    const netSpecial = isSet(specialSv.total) && isSet(specialTax) ? grossMonthly - specialSv.total - specialTax : NaN;

    result.specialPayment = {
      configured: isSet(specialSv.total) && isSet(specialTax) && isSet(netSpecial),
      grossPerPayment: grossMonthly,
      socialInsurance: specialSv.total,
      wageTax: specialTax,
      netPerPayment: netSpecial,
      steps: specialSteps,
    };
  }

  return result;
}
