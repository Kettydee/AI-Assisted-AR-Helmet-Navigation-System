/**
 * Native incoming-call detection and answer/decline.
 *
 * This is intentionally a stub. Both directions of this feature need a real
 * native module and on-device testing this sandbox cannot do:
 *
 * - Detecting a ringing call: Android's telephony APIs have tightened a lot
 *   (READ_PHONE_STATE + a PhoneStateListener/TelephonyCallback used to be
 *   enough; recent Android versions increasingly expect this from the
 *   default dialer app specifically). iOS requires a CXCallObserver
 *   (CallKit) with the right entitlements.
 * - Answering/declining a call programmatically has the same "needs to be
 *   the system dialer, or use CallKit/ConnectionService" constraint on both
 *   platforms - a regular app can't just answer the phone.
 *
 * Rather than write native code no one has run against a real call, this
 * defines the contract the rest of the app (useCallRelay.ts) is built
 * against, with a no-op default so the app is honest about not having this
 * wired up yet instead of silently pretending to. Implementing this for
 * real means: Android - a native module wrapping TelephonyManager/
 * TelecomManager (and likely requesting to be a call-redirection or default
 * dialer app for the answer/decline half); iOS - CXCallObserver via
 * react-native-callkeep or an equivalent. See README.md's Next section.
 */

export type CallObserverEvent =
  | { type: "ringing"; callerName: string | null }
  | { type: "ended" };

export interface CallObserver {
  /** Start listening for native call state changes. */
  start(onEvent: (event: CallObserverEvent) => void): void;
  /** Stop listening. */
  stop(): void;
  /** Answer the current ringing call, if any. */
  answerCall(): void;
  /** Decline/reject the current ringing call, if any. */
  declineCall(): void;
}

class NoopCallObserver implements CallObserver {
  private warned = false;

  private warnOnce(action: string): void {
    if (!this.warned) {
      this.warned = true;
      console.warn(
        `[CallObserver] ${action} requested, but native call detection isn't implemented yet ` +
          "(see src/telephony/CallObserver.ts). Incoming calls won't reach the helmet, and the " +
          "helmet's accept/decline won't reach a real call.",
      );
    }
  }

  start(): void {
    this.warnOnce("start()");
  }

  stop(): void {}

  answerCall(): void {
    this.warnOnce("answerCall()");
  }

  declineCall(): void {
    this.warnOnce("declineCall()");
  }
}

export function createCallObserver(): CallObserver {
  return new NoopCallObserver();
}
