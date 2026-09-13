export default function Login() {
  const handleGoogleLogin = () => {
    window.location.href =
      "http://localhost:5000/api/auth/google";
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-slate-900">
            ReachInbox
          </h1>

          <p className="mt-2 text-slate-500">
            Email scheduling made simple
          </p>
        </div>

        <button
          onClick={handleGoogleLogin}
          className="mt-8 w-full rounded-lg border border-slate-300 bg-white px-4 py-3 font-medium text-slate-700 hover:bg-slate-50"
        >
          Continue with Google
        </button>
      </div>
    </div>
  );
}