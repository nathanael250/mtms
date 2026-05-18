import { useState } from "react";
import { useNavigate } from "react-router-dom";
import mopasLogo from "../../assets/mopas_logo.png";
import { useAuth } from "../../context/AuthContext";

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      await login(form.email, form.password);
      navigate("/dashboard");
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--page-bg)] px-4 py-10">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-[32px] border border-[var(--brand-200)] bg-white shadow-[0_25px_60px_rgba(50,142,255,0.12)] lg:grid-cols-[1.05fr_0.95fr]">
        <section className="hidden bg-[linear-gradient(180deg,var(--brand-700)_0%,var(--brand-600)_100%)] p-10 text-white lg:flex lg:flex-col lg:justify-between">
          <div>
            <img
              src={mopasLogo}
              alt="Mopas logo"
              className="h-12 w-auto object-contain"
            />
            <p className="mt-4 max-w-sm text-sm leading-6 text-blue-100/85">
              Sign in and start managing jobs, tasks, daily reports, staff
              requests, and completion approvals.
            </p>
          </div>

          <div className="rounded-3xl border border-white/15 bg-white/10 p-5 backdrop-blur">
            <p className="text-sm font-semibold">Default admin option</p>
            <p className="mt-2 text-sm text-blue-100/80">
              If you enable backend admin seeding, you can sign in with the
              configured default admin account immediately.
            </p>
          </div>
        </section>

        <section className="p-8 sm:p-10">
          <div className="mx-auto max-w-md">
            <img
              src={mopasLogo}
              alt="Mopas logo"
              className="h-10 w-auto object-contain lg:hidden"
            />
            <p className="mt-6 text-xs font-semibold uppercase tracking-[0.28em] text-[var(--brand-600)]">
              Login
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">
              Welcome back
            </h1>
            <p className="mt-3 text-sm leading-6 text-slate-500">
              Sign in to continue to your MOPAS workspace.
            </p>

            <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-600">
                  Email
                </span>
                <input
                  type="email"
                  value={form.email}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      email: event.target.value,
                    }))
                  }
                  placeholder="name@example.com"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-[var(--brand-500)] focus:bg-white"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-600">
                  Password
                </span>
                <input
                  type="password"
                  value={form.password}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      password: event.target.value,
                    }))
                  }
                  placeholder="Enter password"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-[var(--brand-500)] focus:bg-white"
                />
              </label>

              {error ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-600">
                  {error}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-2xl bg-[var(--brand-700)] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[var(--brand-600)] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSubmitting ? "Signing in..." : "Sign in"}
              </button>
            </form>
          </div>
        </section>
      </div>
    </main>
  );
}
