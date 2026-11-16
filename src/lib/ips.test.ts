import { describe, expect, it } from "vitest";
import { catReference, findReference, ipsPayload, isValidAccount, model97, normalizeAccount } from "./ips";

describe("IPS QR", () => {
  it("checks account numbers", () => {
    expect(isValidAccount("265000000700256005")).toBe(true);
    expect(isValidAccount("265000000700256006")).toBe(false);
    expect(normalizeAccount("265-7002560-05")).toBe("265000000700256005");
    expect(normalizeAccount("265 0000007002560 05")).toBe("265000000700256005");
    // The NBS example: 840-955845-10.
    expect(normalizeAccount("840-955845-10")).toBe("840000000095584510");
  });

  it("builds model 97 references and finds them in statement text", () => {
    expect(model97("123412")).toBe("9714123412"); // NBS example: check pair 14
    const ref = catReference(12);
    expect(ref).toBe("10012");
    const ro = model97(ref);
    expect(findReference(`Uplata, poziv na broj ${ro.slice(0, 4)}-${ro.slice(4)}`)).toBe(ref);
    expect(findReference("97 00 10012")).toBeNull(); // wrong check pair
  });

  it("writes the payload without a payment purpose", () => {
    const payload = ipsPayload({ account: "265000000700256005", recipient: "KRISTINA NIKITINA", amountRsd: 1000, reference: "10012" });
    expect(payload).toBe(`K:PR|V:01|C:1|R:265000000700256005|N:KRISTINA NIKITINA|I:RSD1000,|SF:289|RO:${model97("10012")}`);
    // Tag S is optional in the NBS spec and left out on purpose.
    expect(payload).not.toMatch(/\|S:/);
  });
});
