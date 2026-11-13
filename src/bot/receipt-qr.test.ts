import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { decodeLink, describeReceipt, findReceiptUrl, isReceiptUrl, parseJournal, readReceipt } from "./receipt-qr";

// A made-up receipt link with the real layout: 2 340,50 RSD on 13.11.2026 at 00:30 Belgrade time.
const URL_ = "https://suf.purs.gov.rs/v/?vl=A0FCQ0QxMjM0QUJDRDEyMzSJ4AIA%2BasCAMghZQEAAAAAAAABodIYwMAAAABZMIkZGY10SW%2F7TpnHWobwuvX9rtc78Mu3zIrnVs4qnMcI%2BCnlUyvW8NEoGAR75dZeCqVTvA494KwoGjQPS0lD7FMe7kaQA1coEDbRJzyaF%2FhDBgrGboI86mD5zuH1do5ScpHb1X3K1I0pGwavJyIFbGVmp5KvrA4uUUxtUEeehJjyLvh1%2FXTL6W212K76fFwGObMheHKJOgRy6eKsrYSlyssnl6WUO9Bjfv6dkVZFVbkF5GOFeABI0AB4oOjUg5vuHBRopsRXcslJw2JJtbPek4jfPUB9UjFhQ%2F36G%2BYLbUg510O4fiJAooCWj2F%2FMzisyX68PBAc5rFwBiBPwiGbQ%2Fo%2FVXyFJguA4CaO%2Blni3m6nK8kN8I5DlcJViXmp3kRJiNzfkzd3zi66wEzlztcrQ34X5wKGIhMeOvPFO%2BQQGADUQshAduZMeMQFxpu1BaumOZG4y0%2B6GfA%2BoVElJsIdsNFpU7pNUHy3irYo%2BuIou%2BPre7cWefvXHefMhExlEak9B5qIOcAXkDmgypnyTSgUYLwbnnhLyy%2BhwdjsTOjq4xH0V8VfB96XXYti4FG16cDdJBxR1Pixs0n6%2Bvni1qGhqrTGF8dhnpN5Rw%2FJbOBdkXTJ945EE2O%2BX6wj0JUXUUCjNwxmDGK%2F6wlCSN%2BcT9tNIZaTCQML2GtbzgQmSjK%2B4akdZ%2F%2FDotdOlmjn%2FeZwwh4%3D";
const photo = () => readFileSync(join(__dirname, "__fixtures__", "receipt-photo.jpg"));

const JOURNAL = `<pre>============ ФИСКАЛНИ РАЧУН ============
123456789
MERCATOR-S DOO
Maxi 1234
Кнеза Михаила
Београд-Београд
Касир:                         prodavac1
-------------ПРОМЕТ ПРОДАЈА-------------
Артикли
========================================
Назив   Цена         Кол.         Укупно
Monge Grain Free hrana za mačke 1,5kg /K
OM (Ђ)
    2.000,00          1       2.000,00
Posip za mačke (Ђ)
      170,25          2         340,50
----------------------------------------
Укупан износ:                   2.340,50
========================================
ПФР време:          13.11.2026. 00:30:00
======== КРАЈ ФИСКАЛНОГ РАЧУНА =========</pre>`;

describe("receipt QR", () => {
  it("finds the link in a photo", async () => {
    expect(await findReceiptUrl(photo())).toBe(URL_);
  });

  it("returns null for a photo without a QR code and for a PDF", async () => {
    const sharp = (await import("sharp")).default;
    const blank = await sharp({ create: { width: 600, height: 800, channels: 3, background: "#eee" } }).jpeg().toBuffer();
    expect(await findReceiptUrl(blank)).toBeNull();
    expect(await findReceiptUrl(Buffer.from("%PDF-1.4 hello"))).toBeNull();
  });

  it("only trusts the tax office host", () => {
    expect(isReceiptUrl(URL_)).toBe(true);
    expect(isReceiptUrl(URL_.replace("suf.purs.gov.rs", "evil.example"))).toBe(false);
    expect(isReceiptUrl("http://suf.purs.gov.rs/v/?vl=abc")).toBe(false);
  });

  it("reads total and Belgrade date from the link", () => {
    expect(decodeLink(URL_)).toEqual({ amountRsd: 2341, date: "2026-11-13" });
    // A damaged link fails the checksum.
    expect(decodeLink(URL_.replace(/vl=(.)(.)/, "vl=$2$1"))).toBeNull();
  });

  it("reads shop and items from the journal", () => {
    expect(parseJournal(JOURNAL)).toEqual({ shop: "Maxi 1234", items: ["Monge Grain Free hrana za mačke 1,5kg", "Posip za mačke"] });
  });

  it("uses the tax office answer, and the link when it does not answer", async () => {
    const ok = (async () =>
      new Response(JSON.stringify({ invoiceRequest: { businessName: "MERCATOR-S DOO" }, invoiceResult: { totalAmount: 2340.5, sdcTime: "2026-11-12T23:30:00Z" }, journal: JOURNAL }))) as typeof fetch;
    const r = await readReceipt(URL_, ok);
    expect(r).toMatchObject({ amountRsd: 2341, date: "2026-11-13", shop: "Maxi 1234", verified: true });
    expect(describeReceipt(r!)).toBe("Maxi 1234: Monge Grain Free hrana za mačke 1,5kg, Posip za mačke");

    const down = (async () => { throw new Error("offline"); }) as typeof fetch;
    expect(await readReceipt(URL_, down)).toMatchObject({ amountRsd: 2341, date: "2026-11-13", items: [], verified: false });
  });
});
