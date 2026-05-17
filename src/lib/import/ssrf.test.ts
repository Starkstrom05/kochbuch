import { describe, expect, it, vi, beforeEach } from "vitest";

// node:dns muss vor dem Import von ssrf gemockt werden, weil das Modul beim
// Laden den lookup-Wrapper bindet.
vi.mock("node:dns", () => ({
  promises: {
    lookup: vi.fn(),
  },
}));

import { assertPublicUrl } from "./ssrf";
import { promises as dns } from "node:dns";

const mockedLookup = dns.lookup as unknown as ReturnType<typeof vi.fn>;

function mockDns(addresses: string[]) {
  mockedLookup.mockResolvedValueOnce(
    addresses.map((address) => ({ address, family: address.includes(":") ? 6 : 4 })),
  );
}

describe("assertPublicUrl", () => {
  beforeEach(() => {
    mockedLookup.mockReset();
  });

  it("akzeptiert öffentliche IPv4", async () => {
    mockDns(["93.184.216.34"]); // example.com
    const r = await assertPublicUrl("https://example.com/foo");
    expect(r).toEqual({ ok: true });
  });

  it("lehnt private RFC1918 (10.0.0.0/8) ab", async () => {
    mockDns(["10.0.0.5"]);
    const r = await assertPublicUrl("https://intranet.local/");
    expect(r.ok).toBe(false);
  });

  it("lehnt private RFC1918 (192.168.x.x) ab", async () => {
    mockDns(["192.168.1.10"]);
    const r = await assertPublicUrl("https://router.lan/");
    expect(r.ok).toBe(false);
  });

  it("lehnt 172.16-31 ab, akzeptiert 172.32+", async () => {
    mockDns(["172.20.0.1"]);
    expect((await assertPublicUrl("https://a/")).ok).toBe(false);
    mockDns(["172.32.0.1"]);
    expect((await assertPublicUrl("https://b/")).ok).toBe(true);
  });

  it("lehnt Loopback 127.x ab", async () => {
    mockDns(["127.0.0.1"]);
    expect((await assertPublicUrl("https://localhost.malicious/")).ok).toBe(false);
  });

  it("lehnt Link-Local / Cloud-Metadata 169.254.x ab", async () => {
    mockDns(["169.254.169.254"]);
    expect((await assertPublicUrl("https://aws-metadata.attacker/")).ok).toBe(false);
  });

  it("lehnt CGNAT-Range 100.64-127.x ab", async () => {
    mockDns(["100.64.0.1"]);
    expect((await assertPublicUrl("https://cgnat.local/")).ok).toBe(false);
    mockDns(["100.128.0.1"]);
    expect((await assertPublicUrl("https://public/")).ok).toBe(true);
  });

  it("lehnt 0.0.0.0/8 ab", async () => {
    mockDns(["0.0.0.0"]);
    expect((await assertPublicUrl("https://wildcard/")).ok).toBe(false);
  });

  it("lehnt IPv6 Loopback (::1) ab", async () => {
    mockDns(["::1"]);
    expect((await assertPublicUrl("https://ipv6-local/")).ok).toBe(false);
  });

  it("lehnt IPv6 Unique-Local (fc.., fd..) ab", async () => {
    mockDns(["fc00::1"]);
    expect((await assertPublicUrl("https://ula1/")).ok).toBe(false);
    mockDns(["fd12:3456:789a::1"]);
    expect((await assertPublicUrl("https://ula2/")).ok).toBe(false);
  });

  it("lehnt IPv6 Link-Local (fe80::/10) ab", async () => {
    mockDns(["fe80::1"]);
    expect((await assertPublicUrl("https://linklocal/")).ok).toBe(false);
  });

  it("lehnt unzulässiges Protokoll ab (file:, gopher:)", async () => {
    expect((await assertPublicUrl("file:///etc/passwd")).ok).toBe(false);
    expect((await assertPublicUrl("gopher://attacker/")).ok).toBe(false);
  });

  it("lehnt ungültige URL ab", async () => {
    expect((await assertPublicUrl("not a url")).ok).toBe(false);
  });

  it("lehnt ab, wenn Multi-Result-Resolution irgendeine private IP enthält", async () => {
    // Mehrfach-A-Records: ein public + ein private — bereits ein privater
    // disqualifiziert den Host (sonst DNS-Rebinding-Angriffsfläche).
    mockDns(["8.8.8.8", "10.0.0.1"]);
    expect((await assertPublicUrl("https://dual/")).ok).toBe(false);
  });

  it("akzeptiert IP-Literale ohne DNS-Lookup, wenn public", async () => {
    const r = await assertPublicUrl("https://1.1.1.1/");
    expect(r.ok).toBe(true);
    expect(mockedLookup).not.toHaveBeenCalled();
  });
});
