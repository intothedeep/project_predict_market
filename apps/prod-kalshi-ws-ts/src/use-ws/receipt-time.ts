// Recorded exception to §3.7 rule 5 ("한 venue 안에서 두 시계를 섞지 않는다"),
// 00.architecture.mvp1.md §3.7 + U16 ruling ①. Kalshi's tick/orderbook WS
// messages carry no confirmed event-timestamp field, and trade's
// `created_time` is an unverified REST field name that may resolve to
// undefined/NaN on the WS path — a silent-corruption risk, not a safe
// per-channel choice. Rather than split the venue across two clocks
// (unreadable afterwards: nothing in a row records which clock produced
// it), the ENTIRE Kalshi venue uses receipt time uniformly until U12.
//
// Exit condition (U12, §3.7):
//   (a) Kalshi WS confirms a real event-time field on any channel — move
//       the whole venue onto it in one step.
//   (b) no such field exists — this exception becomes permanent, and
//       §8 Q4's session component stops being optional hardening and
//       becomes the only defense against the resulting §5.4 gap.
export const RECEIPT_TIME_UNTIL_U12 = (): number => Date.now();
