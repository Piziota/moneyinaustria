/**
 * Austrian income tax and social insurance figures, by year.
 *
 * SOURCE OF TRUTH: docs/AUSTRIA-TAX-DATA-2026.md. Every value below is
 * copied from that document, which was compiled and cross-checked
 * against bmf.gv.at, sozialversicherung.at, oesterreich.gv.at, wko.at,
 * RIS (§ 67 EStG 1988), and BMF findok (LStR 2002). Do not edit a value
 * here without updating that document first, and do not add a figure
 * that isn't in it: if something's missing, ask, don't guess.
 *
 * VERIFY EVERY JANUARY. Austrian income tax brackets, social insurance
 * rates, and contribution ceilings are set annually and normally change
 * (brackets have been indexed for "kalte Progression" / bracket creep
 * since 2023). The Sonderzahlungen Freibetrag and Freigrenze have been
 * valorised annually since 2026 too. See the annual update checklist at
 * the bottom of docs/AUSTRIA-TAX-DATA-2026.md.
 */

/** Sentinel for a figure that hasn't been verified yet for a given year. Still a `number`, so the file type-checks; a calculation touching it becomes NaN, which the UI turns into a "not configured" message instead of a fabricated result. */
export const TODO_VERIFY = NaN;

export interface TaxBracket {
  /** Upper bound of this bracket, in EUR of annual taxable income. `null` marks the uncapped top bracket. */
  upTo: number | null;
  /** Marginal rate on the portion of income within this bracket, as a decimal (0.20 = 20%). */
  rate: number;
}

export interface AvBand {
  /** Upper bound of monthly gross salary for this band, in EUR. `null` marks the uncapped top band. */
  upToMonthlyGross: number | null;
  /** Employee Arbeitslosenversicherung rate for this band, as a decimal. */
  rate: number;
}

export interface TaperedAllowanceInfo {
  label: string;
  amount: number;
  incomeCeiling: number;
  taperStart: number;
  taperEnd: number;
  /** Why this does NOT flow automatically into this calculator's monthly net figure. */
  note: string;
}

export interface SonderzahlungenRateBand {
  /** Cumulative upper bound of this slice, in EUR, measured from the start of the Sonderzahlungen tax base (after SV and the Freibetrag). */
  upToCumulative: number;
  rate: number;
}

export interface YearlyTaxRates {
  year: number;
  /** ISO date these figures were last checked against docs/AUSTRIA-TAX-DATA-2026.md. */
  lastVerified: string;

  incomeTax: {
    sourceUrl: string;
    brackets: TaxBracket[];
    /**
     * Annual flat deduction from taxable income (Werbungskostenpauschale).
     * This is baked into the official Lohnsteuertabellen, but this
     * calculator computes tax directly from the brackets above rather
     * than using those tables, so it must be subtracted explicitly from
     * the annual taxable base before applying the brackets. Without
     * this step the calculator overstates wage tax slightly.
     */
    werbungskostenpauschaleAnnual: number;
  };

  socialInsurance: {
    sourceUrl: string;
    /** Flat employee Pensionsversicherung rate. Applies to both a regular month and Sonderzahlungen. */
    pensionsversicherungRate: number;
    /** Flat employee Krankenversicherung rate. Applies to both a regular month and Sonderzahlungen. */
    krankenversicherungRate: number;
    /**
     * Arbeitslosenversicherung, staggered by monthly gross (§ 2a AMPFG).
     * The same bands apply whether valuing a regular month or a single
     * Sonderzahlung; look the band up using the size of that specific
     * payment.
     */
    avBands: AvBand[];
    /** Kammerumlage (AK-Umlage). Levied on a regular month only, NOT on Sonderzahlungen. Not legally part of ASVG, but deducted on every real payslip, so it's included here rather than excluded on a technicality. */
    kammerumlageRate: number;
    /** Wohnbauförderungsbeitrag outside Vienna. Regular month only, NOT Sonderzahlungen. */
    wohnbaufoerderungsbeitragRate: number;
    /** Wohnbauförderungsbeitrag in Vienna, raised from 1.0% to 1.5% (employee half 0.5% to 0.75%) on 1 January 2026. Regular month only, NOT Sonderzahlungen (WBF was never levied on special payments, so this change doesn't affect them). Vienna is, as of this writing, the only Bundesland with a different rate. */
    wohnbaufoerderungsbeitragRateVienna: number;
    /** Höchstbeitragsgrundlage, monthly, for a regular month's pay. */
    monthlyContributionCeiling: number;
    /**
     * Höchstbeitragsgrundlage for Sonderzahlungen: an ANNUAL AGGREGATE
     * across the calendar year's combined special payments, not a
     * per-payment cap. Apply it to the combined 13th + 14th total for
     * the year, not to each payment separately.
     */
    sonderzahlungenAnnualContributionCeiling: number;
  };

  automaticAllowances: {
    /** The only allowance that flows automatically through default payroll with no employee action, no form, no proof. */
    verkehrsabsetzbetrag: { amount: number; sourceUrl: string; note: string };
    /**
     * Documented for completeness; NOT applied by this calculator.
     * Requires Pendlerpauschale declared to the employer via form L34,
     * so it isn't part of a default automatic case.
     */
    erhoehterVerkehrsabsetzbetrag: TaperedAllowanceInfo;
    /**
     * Documented for completeness; NOT applied by this calculator.
     * Granted only through the annual Arbeitnehmerveranlagung, never
     * through payroll, so it must not appear in a monthly net figure.
     */
    zuschlagZumVerkehrsabsetzbetrag: TaperedAllowanceInfo;
  };

  sonderzahlungen: {
    sourceUrl: string;
    /** § 67 Abs 1 EStG 1988. Applied ONCE to the combined annual 13th + 14th total, not once per payment. */
    annualFreibetrag: number;
    /** Freigrenze: if the Jahressechstel is at or below this amount, no tax is levied on Sonderzahlungen at all; the favorable-rate mechanism below is skipped entirely. */
    freigrenze: number;
    /**
     * Progressive rate bands applied, in order, to the Sonderzahlungen
     * tax base (after SV and the Freibetrag), capped at the
     * Jahressechstel. Any amount above the Jahressechstel, or above the
     * top of these bands, is a Sechstelüberhang taxed at the normal
     * progressive tariff (incomeTax.brackets) stacked on top of regular
     * annual income, not at a flat rate.
     */
    rateBands: SonderzahlungenRateBand[];
    note: string;
  };

  scope: {
    inScope: string;
    outOfScope: string[];
  };
}

export const CURRENT_TAX_YEAR = 2026;

export const TAX_RATES: Record<number, YearlyTaxRates> = {
  2026: {
    year: 2026,
    lastVerified: '2026-09-18',

    incomeTax: {
      sourceUrl: 'https://www.bmf.gv.at', // Steuertarif und Steuerabsetzbeträge
      brackets: [
        { upTo: 13539, rate: 0 },
        { upTo: 21992, rate: 0.2 },
        { upTo: 36458, rate: 0.3 },
        { upTo: 70365, rate: 0.4 },
        { upTo: 104859, rate: 0.48 },
        { upTo: 1000000, rate: 0.5 },
        { upTo: null, rate: 0.55 }, // temporary top rate, in force until 2029, then reverts to 50%
      ],
      werbungskostenpauschaleAnnual: 132,
    },

    socialInsurance: {
      sourceUrl: 'https://www.sozialversicherung.at', // Werte der Sozialversicherung 2026
      pensionsversicherungRate: 0.1025,
      krankenversicherungRate: 0.0387,
      avBands: [
        { upToMonthlyGross: 2225.0, rate: 0 },
        { upToMonthlyGross: 2427.0, rate: 0.01 },
        { upToMonthlyGross: 2630.0, rate: 0.02 },
        { upToMonthlyGross: null, rate: 0.0295 },
      ],
      kammerumlageRate: 0.005,
      wohnbaufoerderungsbeitragRate: 0.005,
      wohnbaufoerderungsbeitragRateVienna: 0.0075,
      monthlyContributionCeiling: 6930.0,
      sonderzahlungenAnnualContributionCeiling: 13860.0,
    },

    automaticAllowances: {
      verkehrsabsetzbetrag: {
        amount: 496,
        sourceUrl: 'https://www.bmf.gv.at', // § 33 Abs 5 EStG
        note: 'Automatic in payroll for every employee. No application, no proof required.',
      },
      erhoehterVerkehrsabsetzbetrag: {
        label: 'Erhöhter Verkehrsabsetzbetrag',
        amount: 853,
        incomeCeiling: 15069,
        taperStart: 15069,
        taperEnd: 16056,
        note: 'Requires Pendlerpauschale entitlement declared to the employer via form L34. Not part of a default automatic case, so this calculator does not apply it.',
      },
      zuschlagZumVerkehrsabsetzbetrag: {
        label: 'Zuschlag zum Verkehrsabsetzbetrag',
        amount: 804,
        incomeCeiling: 19761,
        taperStart: 19761,
        taperEnd: 30259,
        note: 'Granted only through the annual Arbeitnehmerveranlagung, never through payroll. Must not appear in a monthly net pay figure, so this calculator does not apply it.',
      },
    },

    sonderzahlungen: {
      sourceUrl: 'https://www.ris.bka.gv.at', // § 67 Abs 1 EStG 1988
      annualFreibetrag: 620,
      freigrenze: 2615,
      rateBands: [
        { upToCumulative: 620, rate: 0 },
        { upToCumulative: 25000, rate: 0.06 },
        { upToCumulative: 50000, rate: 0.27 },
        { upToCumulative: 83333, rate: 0.3575 },
      ],
      note: 'Base = combined 13th/14th salary for the year, minus the employee SV share on that amount, minus the 620 EUR Freibetrag (applied once, annually), capped at the Jahressechstel. Jahressechstel = (current monthly gross × 12) / 6. Anything above the Jahressechstel, or above the top of these rate bands, is taxed at the normal progressive tariff on top of regular annual income, not at a flat rate.',
    },

    scope: {
      inScope: 'Standard ASVG-insured private-sector employees (Angestellte/Arbeiter).',
      outOfScope: [
        'Self-employed people (SVS)',
        'Civil servants (B-KUVG)',
        'Church tax (Kirchenbeitrag)',
        'Benefits in kind (Sachbezüge), e.g. a company car',
        'Overtime and its tax-free allowances',
        'Apprentices (different rates)',
        'Marginal employment (Geringfügigkeit, EUR 551.10/month threshold)',
        'Bundesland differences other than the Vienna Wohnbauförderungsbeitrag rate above',
      ],
    },
  },
};

export function getTaxRatesForYear(year: number): YearlyTaxRates | undefined {
  return TAX_RATES[year];
}
