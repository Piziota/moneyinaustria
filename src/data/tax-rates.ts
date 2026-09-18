/**
 * Austrian income tax and social insurance figures, by year.
 *
 * VERIFY EVERY JANUARY. Austrian income tax brackets, social insurance
 * rates, and contribution ceilings are set annually and normally change
 * (brackets have been indexed for "kalte Progression" / bracket creep
 * since 2023, so even the thresholds move most years without a change in
 * law). Never carry a year's numbers forward into the next year without
 * re-checking every one of them.
 *
 * Every numeric value below is the TODO_VERIFY sentinel (see below). None
 * of these figures have been confirmed against an official source. Do not
 * use this file, or anything built on it, until every TODO_VERIFY has
 * been replaced with a number you have personally checked, and the
 * comment next to it updated with the exact page and date checked.
 *
 * Primary official sources:
 * - https://www.bmf.gv.at
 *   Bundesministerium für Finanzen. Income tax brackets
 *   (Einkommensteuertarif) and tax credits (Absetzbeträge).
 * - https://www.oesterreich.gv.at
 *   Plain-language citizen portal. Useful for cross-checking BMF figures,
 *   not a primary source on its own.
 * - https://www.gesundheitskasse.at
 *   Österreichische Gesundheitskasse (ÖGK). Employee social insurance
 *   contribution rates (Beitragssätze).
 * - https://www.sozialversicherung.at
 *   Dachverband der Sozialversicherungsträger. Publishes the annual
 *   "Werte der Sozialversicherung" document, which includes the
 *   Höchstbeitragsgrundlage.
 *
 * I have not verified the exact page paths on any of these sites, only
 * the domains themselves. Confirm the specific page each time you check
 * a value, since government site structures change.
 */

/**
 * Sentinel for "not yet verified." `NaN` still satisfies TypeScript's
 * `number` type, so this file type-checks and the site builds, but any
 * calculation that touches a TODO_VERIFY value becomes NaN itself. The
 * calculator UI checks for that and shows a "not configured yet" message
 * instead of a fabricated number.
 *
 * Never replace a TODO_VERIFY with a guess, an old year's figure, or a
 * number you recall but haven't checked. Replace it only with a number
 * you've confirmed against the source URL given next to it.
 */
export const TODO_VERIFY = NaN;

export interface TaxBracket {
  /**
   * Upper bound of this bracket, in EUR of annual taxable income.
   * `null` marks the top bracket, which has no upper bound (this is
   * structural, not a figure to verify).
   */
  upTo: number | null;
  /** Marginal rate on the portion of income within this bracket, as a decimal (0.20 = 20%). */
  rate: number;
}

export interface SocialInsuranceContribution {
  /** Stable key used to identify this line in code. */
  id: string;
  /** English-first label with the German term, shown in the UI. */
  label: string;
  /** Employee's share of this contribution, as a decimal (e.g. 0.0387 for 3.87%). */
  employeeRate: number;
}

export interface AutomaticAllowance {
  id: string;
  label: string;
  /** Annual amount in EUR. Use TODO_VERIFY if unknown; use `null` only if the allowance is genuinely not a flat amount (describe the real structure in `note`). */
  amount: number | null;
  sourceUrl: string;
  note: string;
}

export interface SonderzahlungenTaxTreatment {
  sourceUrl: string;
  /**
   * Portion of a year's total 13th/14th salary payments that is tax-free,
   * in EUR. Historically Austria has taxed Sonderzahlungen more
   * favorably than regular salary under a "tax-free slice, then a flat
   * rate" scheme (§ 67 EStG territory) rather than the progressive
   * brackets above. TODO_VERIFY whether this mechanism, not just this
   * number, is still how it works for the target year.
   */
  annualTaxFreeAllowance: number;
  /** Flat rate applied above the tax-free allowance, up to `favorableRateCeiling`. */
  flatRate: number;
  /**
   * Above this annual total of Sonderzahlungen, the excess is no longer
   * taxed at the flat rate above. This calculator does not currently
   * model what happens above this ceiling; see the note in
   * `grossNetCalculator.ts`. TODO_VERIFY the exact figure and mechanism.
   */
  favorableRateCeiling: number;
  note: string;
}

export interface YearlyTaxRates {
  year: number;
  incomeTax: {
    sourceUrl: string;
    /**
     * TODO_VERIFY the number of brackets too, not just the thresholds
     * and rates. The 7 entries below (0%, 20%, 30%, 40%, 48%, 50%, 55%)
     * reflect the bracket structure Austria has used in recent years,
     * from general recollection only. This has not been checked against
     * bmf.gv.at and the structure itself could have changed.
     */
    brackets: TaxBracket[];
  };
  socialInsurance: {
    sourceUrl: string;
    /** Combined employee-side ASVG contributions for a typical private-sector employee (Angestellte/Arbeiter). */
    employeeContributions: SocialInsuranceContribution[];
    /**
     * Monthly gross salary above which no further social insurance is
     * withheld (Höchstbeitragsgrundlage).
     */
    monthlyContributionCeiling: number;
    /**
     * Separate ceiling that applies to 13th/14th salary payments
     * (Höchstbeitragsgrundlage für Sonderzahlungen). TODO_VERIFY the
     * exact definition: sozialversicherung.at treats this as a
     * per-year figure covering the sum of a year's special payments,
     * not a per-payment cap. This file's calculator applies it
     * per-payment as a simplification; see the note in
     * `grossNetCalculator.ts`.
     */
    specialPaymentContributionCeiling: number;
  };
  /**
   * Allowances applied automatically via standard payroll, with no
   * action needed from the employee. Deliberately excludes anything
   * that requires an active claim or declaration, such as the
   * Familienbonus Plus, Alleinverdiener-/Alleinerzieherabsetzbetrag, or
   * Pendlerpauschale. Confirm this distinction still holds before
   * adding anything here: if in doubt, leave it out and note why.
   */
  automaticAllowances: AutomaticAllowance[];
  sonderzahlungen: SonderzahlungenTaxTreatment;
}

export const CURRENT_TAX_YEAR = 2026;

export const TAX_RATES: Record<number, YearlyTaxRates> = {
  2026: {
    year: 2026,
    incomeTax: {
      sourceUrl: 'https://www.bmf.gv.at', // TODO_VERIFY: find the exact "Einkommensteuertarif" page for 2026
      brackets: [
        { upTo: TODO_VERIFY, rate: TODO_VERIFY }, // TODO_VERIFY: tax-free threshold, historically taxed at 0%. Source: bmf.gv.at
        { upTo: TODO_VERIFY, rate: TODO_VERIFY }, // TODO_VERIFY: historically around 20%. Source: bmf.gv.at
        { upTo: TODO_VERIFY, rate: TODO_VERIFY }, // TODO_VERIFY: historically around 30%. Source: bmf.gv.at
        { upTo: TODO_VERIFY, rate: TODO_VERIFY }, // TODO_VERIFY: historically around 40%. Source: bmf.gv.at
        { upTo: TODO_VERIFY, rate: TODO_VERIFY }, // TODO_VERIFY: historically around 48%. Source: bmf.gv.at
        { upTo: TODO_VERIFY, rate: TODO_VERIFY }, // TODO_VERIFY: historically around 50%. Source: bmf.gv.at
        { upTo: null, rate: TODO_VERIFY }, // top bracket, no upper bound. Historically around 55%. Source: bmf.gv.at
      ],
    },
    socialInsurance: {
      sourceUrl: 'https://www.sozialversicherung.at', // TODO_VERIFY: find the annual "Werte der Sozialversicherung" page for 2026
      employeeContributions: [
        {
          id: 'krankenversicherung',
          label: 'Health insurance (Krankenversicherung)',
          employeeRate: TODO_VERIFY, // TODO_VERIFY. Source: gesundheitskasse.at
        },
        {
          id: 'pensionsversicherung',
          label: 'Pension insurance (Pensionsversicherung)',
          employeeRate: TODO_VERIFY, // TODO_VERIFY. Source: sozialversicherung.at
        },
        {
          id: 'arbeitslosenversicherung',
          label: 'Unemployment insurance (Arbeitslosenversicherung)',
          // TODO_VERIFY. Source: sozialversicherung.at
          // NOTE: Austria reduces or waives this contribution for low
          // monthly gross income (a graduated scale, sometimes called
          // the AV-Staffelung). This file only models a single flat
          // rate. If you want accurate results for low earners, this
          // needs a small threshold table instead of one number, not
          // just a verified figure, flagging this rather than guessing
          // at the thresholds.
          employeeRate: TODO_VERIFY,
        },
        {
          id: 'wohnbaufoerderungsbeitrag',
          label: 'Housing subsidy contribution (Wohnbauförderungsbeitrag)',
          employeeRate: TODO_VERIFY, // TODO_VERIFY. Source: sozialversicherung.at
        },
      ],
      monthlyContributionCeiling: TODO_VERIFY, // TODO_VERIFY (Höchstbeitragsgrundlage, monthly). Source: sozialversicherung.at
      specialPaymentContributionCeiling: TODO_VERIFY, // TODO_VERIFY. Source: sozialversicherung.at. See caveat above.
    },
    automaticAllowances: [
      {
        id: 'verkehrsabsetzbetrag',
        label: 'Basic commuter tax credit (Verkehrsabsetzbetrag)',
        amount: TODO_VERIFY, // TODO_VERIFY annual amount. Source: bmf.gv.at
        sourceUrl: 'https://www.bmf.gv.at',
        note: 'Applied automatically via payroll to active employees regardless of actual commute; distinct from the Pendlerpauschale, which must be claimed. TODO_VERIFY whether an increased amount for lower incomes still applies for this year; if so, this needs a second tier here instead of one flat amount.',
      },
    ],
    sonderzahlungen: {
      sourceUrl: 'https://www.bmf.gv.at', // TODO_VERIFY: find the exact page describing "sonstige Bezüge" tax treatment for 2026
      annualTaxFreeAllowance: TODO_VERIFY, // TODO_VERIFY
      flatRate: TODO_VERIFY, // TODO_VERIFY
      favorableRateCeiling: TODO_VERIFY, // TODO_VERIFY
      note: 'This models the standard "tax-free slice, then a flat rate" treatment historically used for the 13th/14th salary in Austria. Confirm this mechanism itself, not just the numbers, still applies for the target year: tax law changes could alter the structure, not only the rate or threshold.',
    },
  },
};

export function getTaxRatesForYear(year: number): YearlyTaxRates | undefined {
  return TAX_RATES[year];
}
