# ComGate Setup

## Co je potreba od ComGate:
1. Merchant ID (6mistne cislo)
2. Secret (heslo pro shop connection)
3. Aktivace "Recurring payments" feature (kontaktovat ComGate support)

## Nastaveni URLs v ComGate portalu (Integration > Shop settings):
- PENDING URL: https://fachmani.org/payment/pending
- PAID URL: https://fachmani.org/payment/success
- CANCELLED URL: https://fachmani.org/payment/fail
- Result delivery URL (webhook): https://fachmani.org/api/payments/webhook

## IP whitelist:
Pridat IP adresy Vercelu do whitelistu (nebo vypnout IP check a chranit secret).

## Test mode:
Dokud nejsou credentials, COMGATE_TEST_MODE=true simuluje cely flow bez realneho API.
V test mode se zobrazi stranka /payment/test-gateway s tlacitky Simulovat uspech/selhani.

## Recurring payments:
Musi byt aktivovane pres ComGate support. Bez toho nebude fungovat Premium predplatne.

## Cenik akci:
- Odeslani nabidky: 29 Kc
- Topovani profilu (7 dni): 99 Kc
- Boost na feedu (1 den): 49 Kc
- Premium predplatne: 499 Kc/mesic

## Architektura:
- Fachman si nabije kredity (500/1000/2000/5000 Kc nebo custom) pres ComGate
- Kredity se ukladaji do DB (tabulka wallets)
- Akce (nabidka, topovani, boost) se strhavaji z kreditu interne
- Premium predplatne pres ComGate recurring payments
