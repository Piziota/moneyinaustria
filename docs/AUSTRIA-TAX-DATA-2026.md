# Austrian tax & SV reference data — 2026

Answers to the 21 open questions on the Brutto→Netto calculator.
Compiled 18 September 2026. Scope: ASVG private-sector employees.

**Rule for Claude: use ONLY the values in this file. Do not substitute
remembered figures. Every open question is now resolved — there are no
TODO_VERIFY items left. If something you need is not in this file, ask
rather than guessing.**

---

## INCOME TAX BRACKETS

### Q1. Still 7 brackets?
**Yes.** Seven brackets, rates 0 / 20 / 30 / 40 / 48 / 50 / 55%. No structural
change for 2026. The 55% top rate is temporary until 2029, then reverts to 50%.

### Q2 + Q3. Thresholds and marginal rates, 2026

| Annual income (EUR) | Marginal rate |
|---|---|
| 0 – 13,539 | 0% |
| 13,539 – 21,992 | 20% |
| 21,992 – 36,458 | 30% |
| 36,458 – 70,365 | 40% |
| 70,365 – 104,859 | 48% |
| 104,859 – 1,000,000 | 50% |
| over 1,000,000 | 55% |

Thresholds raised 1.733% for 2026 (two-thirds of 2.6% inflation). The
1,000,000 threshold is never indexed. Rates themselves unchanged.

Source: bmf.gv.at — Steuertarif und Steuerabsetzbeträge.
2025 comparison: 13,308 / 21,617 / 35,836 / 69,166 / 103,072.

---

## SOCIAL INSURANCE — EMPLOYEE SHARE (DN-Anteil), 2026

### Q4. Krankenversicherung: **3.87%**
### Q5. Pensionsversicherung: **10.25%**
### Q6. Arbeitslosenversicherung: **2.95%** at the full rate (staggered below)
### Q8. Wohnbauförderungsbeitrag: **0.50%** — but **0.75% in Vienna** from 1.1.2026

### Q7. AV staggering — YES, model it

| Monthly gross | PV | KV | AV | KU/WF | Total, current pay | Total, Sonderzahlung |
|---|---|---|---|---|---|---|
| up to 2,225.00 | 10.25 | 3.87 | 0% | 1.0 | **15.12%** | 14.12% |
| 2,225.01 – 2,427.00 | 10.25 | 3.87 | 1% | 1.0 | **16.12%** | 15.12% |
| 2,427.01 – 2,630.00 | 10.25 | 3.87 | 2% | 1.0 | **17.12%** | 16.12% |
| over 2,630.00 | 10.25 | 3.87 | 2.95% | 1.0 | **18.07%** | 17.07% |

Legal basis § 2a AMPFG. Worth modelling: students, part-timers and
Werkstudenten frequently sit in these bands, and a flat 18.07% would
materially overstate their deductions.

Sonderzahlung rates are 1 point lower because KU and WBF are not levied
on special payments.

### VIENNA EXCEPTION — affects most of this site's audience

Vienna raised the Wohnbauförderungsbeitrag from 1% to 1.5% on 1 January 2026,
so the employee half rose from 0.5% to 0.75%.

- Vienna, current pay: **18.32%** (top band) instead of 18.07%
- Vienna, Sonderzahlungen: **17.07%**, unchanged — WBF isn't levied on them
- Add 0.25 points to every band in the table above for Vienna
- Applies to employees insured with ÖGK Vienna, or whose place of work is Vienna
- Vienna is the only Bundesland that raised it

**Implement as a Vienna / rest-of-Austria toggle, defaulting to Vienna,
with a one-line explanation.**

### Q9. AK-Umlage — scope decision: INCLUDE IT

Note first: **if you use 18.07% you are already including it.** The 1.0%
"KU/WF" component is Kammerumlage (0.5%) plus Wohnbauförderungsbeitrag (0.5%).
So the real question is whether to strip it out. Don't.

The calculator's job is to predict the number at the bottom of a payslip.
AK-Umlage is deducted there. Excluding it on the grounds that it sits outside
ASVG's legal scope would make the output wrong by ~0.5% of gross for a
distinction no reader cares about.

Label the line "Social insurance and payroll levies" rather than strictly
"ASVG contributions", and note in the breakdown that it includes AK-Umlage
and Wohnbauförderungsbeitrag.

---

## CONTRIBUTION CEILINGS (Höchstbeitragsgrundlage), 2026

### Q10. Monthly ceiling, current pay: **EUR 6,930.00** (daily 231.00)

### Q11. Sonderzahlungen ceiling: **EUR 13,860.00 per CALENDAR YEAR — annual aggregate**

**This corrects the current code.** It is not a per-payment cap. It is a
single annual pot across all special payments in the calendar year.
The existing per-payment implementation overstates SV for anyone whose
combined 13th + 14th exceeds 13,860.

2025 comparison: 6,450 monthly / 12,900 annual.

Note: Betriebliche Vorsorge contributions are still due above the ceiling,
but that's employer-side and outside this calculator.

---

## AUTOMATIC ALLOWANCES

### Q12. Verkehrsabsetzbetrag base: **EUR 496/year** (2025: 487)
Automatic in payroll, no application, no proof required. § 33 Abs 5 EStG.

### Q13. Increased/tiered VAB — yes, it still exists

| Item | Amount | Condition |
|---|---|---|
| Verkehrsabsetzbetrag | 496 | all employees, automatic |
| Erhöhter VAB | 853 | Pendlerpauschale entitlement AND income ≤ 15,069 |
| — taper | 853 → 496 | evenly between 15,069 and 16,056 |
| Zuschlag zum VAB | up to 804 | income ≤ 19,761 |
| — taper | 804 → 0 | evenly between 19,761 and 30,259 |

**Only the 496 flows automatically through payroll in a default case.**
The increased VAB requires Pendlerpauschale declared to the employer (form L34).
The Zuschlag is granted ONLY through the Arbeitnehmerveranlagung, never payroll —
so it must not appear in a monthly net figure.

2025 comparison: 487 / 838 / 790.

### Q14. Anything else automatic? No — your exclusions are correct

Correctly excluded, all requiring employee action:
- Familienbonus Plus (form E30)
- Alleinverdiener- / Alleinerzieherabsetzbetrag (form E30)
- Pendlerpauschale (form L34)
- Zuschlag zum Verkehrsabsetzbetrag (assessment only)

### Werbungskostenpauschale — RESOLVED

The 132 EUR annual Werbungskostenpauschale **is built into the monthly
Lohnsteuer calculation**. It is integrated into the official wage tax tables
(Lohnsteuertabellen), not applied only at assessment.

Sources: BMF, Werbungskosten overview; Lohnsteuerrichtlinien LStR 2002 Rz 320 ff.

**IMPLEMENTATION CONSEQUENCE — do not skip this.** Because the allowance is
baked into the official tables and this calculator computes tax from the
bracket table directly, it must be subtracted explicitly: reduce the annual
tax base by 132 EUR (11 EUR per month) before applying the brackets.
Without this the calculator will report slightly more wage tax than payroll
actually deducts. Add a line to the breakdown so the deduction is visible.

---

## SONDERZAHLUNGEN (13th/14th) TAX TREATMENT — § 67 EStG

Base = sum of sonstige Bezüge − employee SV share − 620 Freibetrag,
capped at the Jahressechstel.

### Q15. Tax-free allowance: **EUR 620** (Freibetrag, taxed at 0%)

### Q16 + Q17. Rate bands within the Jahressechstel

| Slice | Rate |
|---|---|
| first 620 | 0% |
| next 24,380 | 6% |
| next 25,000 | 27% |
| next 33,333 | 35.75% |

So the favourable treatment runs out at **83,333**.

### Q18. What happens above the ceiling

**Taxed at the normal progressive tariff** (the Q2 table). Same for any amount
exceeding the Jahressechstel, known as the Sechstelüberhang. Not a different
flat rate. This resolves the currently unmodelled case — implement it by
routing the excess through the standard bracket calculation.

### Q19. Is the mechanism still current law for 2026? **Yes.**
Confirmed in the 2026 payroll value tables, not just the numbers.

### Freigrenze: **EUR 2,615 for 2026**
If the Jahressechstel is at most 2,615, fixed-rate taxation is skipped entirely.
Ignore older figures of 2,100 and 2,447 — both outdated. Both the Freibetrag
and the Freigrenze have been automatically valorised annually since 2026
(Freigrenze in § 67 Abs 1 EStG, Einschleifbetrag in § 77 Abs 4 EStG).

Jahressechstel = (current monthly gross × 12) / 6, i.e. roughly two average
gross monthly salaries.

### Freibetrag scope — RESOLVED

The 620 EUR Freibetrag is an **annual** amount, not per special payment.

Source: § 67 Abs 1 EStG 1988 (RIS).

**IMPLEMENTATION:** deduct 620 once from the combined sonstige Bezüge for the
calendar year, not 620 from each of the 13th and 14th. Calculator sites
claiming per-payment are wrong. Applying it twice understates tax by roughly
37 EUR a year at the 6% rate.

---

## YEAR AND SCOPE

### Q20. CURRENT_TAX_YEAR = **2026**
Fully published and in force since 1 January 2026. No need to fall back to 2025.
Structure the config by year so 2027 can be added alongside rather than
overwriting — 2027 figures are already being previewed (tax-free threshold
rising to ~13,846), so the structure will get used.

### Q21. Scope — keep it narrow

In scope: standard ASVG private-sector employees.

Out of scope, and say so on the page: self-employed (SVS), civil servants
(B-KUVG), church tax, benefits in kind (Sachbezüge), overtime and its
tax-free allowances, apprentices (different rates), marginal employment
(Geringfügigkeit, 551.10/month), and Bundesland differences other than the
Vienna WBF above.

Expanding multiplies edge cases without serving the core audience. Revisit
only if readers actually ask.

---

## VERIFICATION STATUS

Cross-checked against: bmf.gv.at (brackets, Verkehrsabsetzbetrag),
sozialversicherung.at / oesterreich.gv.at / wko.at (ceilings, contribution
rates), and 2026 payroll value tables (Sonderzahlungen bands, AV staggering).
Vienna WBF change confirmed across multiple payroll advisories.

Both previously open items are now resolved against primary sources
(§ 67 Abs 1 EStG 1988 via RIS; LStR 2002 Rz 320 ff. via BMF findok).

Before launch:
1. Test against a real Vienna payslip at 18.32%
2. Cross-check against brutto-netto-rechner.at at several salary levels:
   one in each AV band, one above the 6,930 ceiling, one near a bracket edge
3. Re-verify every figure each January — all of it changes annually

## ANNUAL UPDATE CHECKLIST (January)

- [ ] Income tax bracket thresholds (indexed every year)
- [ ] Höchstbeitragsgrundlage, monthly and Sonderzahlungen
- [ ] AV staggering thresholds
- [ ] Verkehrsabsetzbetrag, increased VAB, Zuschlag, and all taper limits
- [ ] Sonderzahlungen Freigrenze (valorised annually since 2026)
- [ ] Whether any other Bundesland has followed Vienna on the WBF
- [ ] Update the "last verified" date on the page

Last verified: 18 September 2026.
