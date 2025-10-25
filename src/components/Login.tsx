import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import styles from "./Login.module.css";

type Mode = "signin" | "signup";

const isEmail = (v: string): boolean =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

export default function Login() {
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState<string>("");
  const [pw, setPw] = useState<string>("");
  const [pw2, setPw2] = useState<string>("");
  const [pending, setPending] = useState<boolean>(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [showPw, setShowPw] = useState<boolean>(false);
  const [showPw2, setShowPw2] = useState<boolean>(false);

  const passwordError: string | null = (() => {
    if (mode === "signin") return null;
    if (pw.length < 6) return "비밀번호는 6자 이상이어야 합니다.";
    if (pw2.length > 0 && pw !== pw2) return "비밀번호가 서로 다릅니다.";
    return null;
  })();

  const canSubmit: boolean =
    isEmail(email) &&
    pw.length >= 6 &&
    (mode === "signin" || (pw2.length >= 6 && pw === pw2)) &&
    !pending;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    setErr(null);
    setOk(null);
    if (!canSubmit) return;

    setPending(true);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password: pw,
        });
        if (error) throw error;
        setOk("로그인 성공");
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password: pw,
        });
        if (error) throw error;

        // 회원가입 직후: 로그인 화면으로 전환
        setMode("signin");
        setOk("회원가입 완료! 이메일을 확인해주세요!");
        setPw("");
        setPw2("");
      }
    } catch (e: unknown) {
      const message =
        e instanceof Error ? e.message : "인증 중 알 수 없는 오류";
      setErr(message);
    } finally {
      setPending(false);
    }
  }

  async function resetPassword(): Promise<void> {
    setErr(null);
    setOk(null);
    if (!isEmail(email)) {
      setErr("올바른 이메일을 입력해주세요.");
      return;
    }
    setPending(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin,
      });
      if (error) throw error;
      setOk("비밀번호 재설정 메일을 보냈습니다.");
    } catch (e: unknown) {
      const message =
        e instanceof Error ? e.message : "재설정 메일 전송 중 오류";
      setErr(message);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.wrapper}>
        <div className={styles.title}>ZapSheet</div>

        <div className={styles.card}>
          <h2 className={styles.heading}>
            {mode === "signin" ? "로그인" : "회원가입"}
          </h2>

          <form className={styles.form} onSubmit={onSubmit}>
            {/* Email */}
            <div className={styles.field}>
              <label className={styles.label} htmlFor="email">
                Email
              </label>
              <div className={styles.inputRow}>
                <input
                  id="email"
                  className={styles.input}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  type="email"
                  placeholder="you@example.com"
                  autoComplete="email"
                  required
                />
              </div>
              {!isEmail(email) && email.length > 0 && (
                <div className={styles.helper}>이메일 형식 확인.</div>
              )}
            </div>

            {/* Password */}
            <div className={styles.field}>
              <label className={styles.label} htmlFor="password">
                Password
              </label>
              <div className={styles.inputRow}>
                <input
                  id="password"
                  className={styles.input}
                  value={pw}
                  onChange={(e) => setPw(e.target.value)}
                  type={showPw ? "text" : "password"}
                  placeholder={mode === "signin" ? "비밀번호" : "6자 이상"}
                  autoComplete={
                    mode === "signin" ? "current-password" : "new-password"
                  }
                  required
                />
                <button
                  type="button"
                  className={styles.pwToggle}
                  onClick={() => setShowPw((v) => !v)}
                  aria-label={showPw ? "비밀번호 숨기기" : "비밀번호 표시"}
                >
                  {showPw ? "숨김" : "표시"}
                </button>
              </div>
            </div>

            {/* Password Confirm (signup only) */}
            {mode === "signup" && (
              <div className={styles.field}>
                <label className={styles.label} htmlFor="password2">
                  Confirm Password
                </label>
                <div className={styles.inputRow}>
                  <input
                    id="password2"
                    className={styles.input}
                    value={pw2}
                    onChange={(e) => setPw2(e.target.value)}
                    type={showPw2 ? "text" : "password"}
                    placeholder="비밀번호 재입력"
                    autoComplete="new-password"
                    required
                  />
                  <button
                    type="button"
                    className={styles.pwToggle}
                    onClick={() => setShowPw2((v) => !v)}
                    aria-label={showPw2 ? "비밀번호 숨기기" : "비밀번호 표시"}
                  >
                    {showPw2 ? "숨김" : "표시"}
                  </button>
                </div>
                {passwordError && (
                  <div className={styles.helper}>{passwordError}</div>
                )}
              </div>
            )}

            {/* Alerts */}
            {err && (
              <div className={styles.error}>
                아이디, 비밀번호를 확인해주세요
              </div>
            )}
            {ok && <div className={styles.ok}>{ok}</div>}

            {/* Submit */}
            <div className={styles.actions}>
              <button
                disabled={!canSubmit}
                type="submit"
                className={styles.submitBtn}
              >
                {pending
                  ? "처리 중..."
                  : mode === "signin"
                  ? "로그인"
                  : "회원가입"}
              </button>

              {/* 회원가입 / 비번 리셋 버튼 꾸밈 */}
              <div className={styles.secondaryRow}>
                <button
                  type="button"
                  className={styles.secondaryBtn}
                  onClick={() => {
                    setErr(null);
                    setOk(null);
                    setPw("");
                    setPw2("");
                    setMode((m) => (m === "signin" ? "signup" : "signin"));
                  }}
                >
                  {mode === "signin" ? "회원가입" : "로그인으로"}
                </button>

                <button
                  type="button"
                  className={styles.secondaryBtn}
                  onClick={resetPassword}
                >
                  비밀번호 재설정
                </button>
              </div>

              <div className={styles.switchRow}>
                {/* 필요 시 추가 안내 문구 영역 */}
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
