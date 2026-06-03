export default function AuthLayout({ children }) {
  return (
    <div className="min-h-screen grid place-items-center bg-muted/40">
      {children}
    </div>
  );
}
