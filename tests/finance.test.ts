import { describe, expect, it } from "vitest";
import {
  adjustedCharges,
  adjustedMonthlyTarget,
  annualSavingsRate,
  annualTrajectory,
  daysInMonth,
  ecartPointage,
  monthlySavingsRate,
  radQuotidien,
  radRestantReel,
  radTheorique,
  savingsGaugeStatus,
  soldeTheorique,
} from "../src/lib/finance";

describe("rattrapage dynamique", () => {
  it("répartit le restant sur les mois restants", () => {
    // Cible annuelle 6000, 2000 épargnés, 8 mois restants → 500/mois
    expect(adjustedMonthlyTarget(6000, 2000, 8)).toBe(500);
  });
  it("ne devient jamais négatif (objectif dépassé)", () => {
    expect(adjustedMonthlyTarget(6000, 7000, 3)).toBe(0);
  });
  it("gère 0 mois restant", () => {
    expect(adjustedMonthlyTarget(6000, 2000, 0)).toBe(0);
  });
});

describe("taux d'épargne", () => {
  it("mensuel", () => expect(monthlySavingsRate(500, 2500)).toBe(20));
  it("mensuel avec revenu nul", () => expect(monthlySavingsRate(500, 0)).toBe(0));
  it("annuel", () => expect(annualSavingsRate(3000, 15000)).toBe(20));
});

describe("jauge d'épargne", () => {
  it("surplus si au-dessus de la cible", () =>
    expect(savingsGaugeStatus(600, 500, false)).toBe("surplus"));
  it("atteint si égal", () => expect(savingsGaugeStatus(500, 500, false)).toBe("atteint"));
  it("en cours si sous la cible et mois non fini", () =>
    expect(savingsGaugeStatus(200, 500, false)).toBe("en_cours"));
  it("non atteint si sous la cible et mois fini", () =>
    expect(savingsGaugeStatus(200, 500, true)).toBe("non_atteint"));
});

describe("trajectoire annuelle", () => {
  it("avance", () => expect(annualTrajectory(4000, 6000, 6)).toBe("avance"));
  it("à jour", () => expect(annualTrajectory(3000, 6000, 6)).toBe("a_jour"));
  it("rattrapage", () => expect(annualTrajectory(2000, 6000, 6)).toBe("rattrapage"));
});

describe("charges & RAD", () => {
  it("charges ajustées : réel prioritaire sur prévu", () => {
    expect(
      adjustedCharges([
        { expected: 100, actual: 120 },
        { expected: 50, actual: null },
      ])
    ).toBe(170);
  });
  it("RAD avec épargne versée", () => {
    // 2500 − 600 (versée) − 800 − 100 = 1000
    expect(radTheorique(2500, 600, 500, 800, 100)).toBe(1000);
  });
  it("RAD sans épargne versée : utilise la cible ajustée", () => {
    // 2500 − 500 (cible) − 800 − 100 = 1100
    expect(radTheorique(2500, 0, 500, 800, 100)).toBe(1100);
  });
  it("RAD quotidien", () => expect(radQuotidien(300, 10)).toBe(30));
});

describe("pointage bancaire", () => {
  it("solde théorique avec prorata du budget courant", () => {
    // ancrage 1000 + revenu 2500 − épargne 500 − charges payées 800 − grosses dép. 0
    // − prorata (RAD 1200 × 15/30 = 600) = 1600
    expect(
      soldeTheorique({
        anchor: 1000,
        income: 2500,
        savingsDeposited: 500,
        chargesPaid: 800,
        bigExpensesTotal: 0,
        radTheo: 1200,
        dayOfMonth: 15,
        daysInMonth: 30,
      })
    ).toBe(1600);
  });
  it("écart négatif = surconsommation", () => {
    expect(ecartPointage(1500, 1600)).toBe(-100);
  });
  it("RAD restant réel déduit les engagements restants", () => {
    // 1500 − 200 charges impayées − (500 − 300) épargne restante = 1100
    expect(
      radRestantReel({
        soldeReel: 1500,
        chargesUnpaidExpected: 200,
        savingsDeposited: 300,
        adjustedTarget: 500,
      })
    ).toBe(1100);
  });
});

describe("dates", () => {
  it("jours dans le mois", () => {
    expect(daysInMonth(2026, 2)).toBe(28);
    expect(daysInMonth(2024, 2)).toBe(29);
    expect(daysInMonth(2026, 7)).toBe(31);
  });
});
