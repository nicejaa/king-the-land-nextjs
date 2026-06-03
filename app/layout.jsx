import "./globals.css";
import { Providers } from "providers";

export const metadata = {
  title: {
    template: "%s | King The Land CMS",
    default: "King The Land - Construction Management System",
  },
  description: "Enterprise Construction Management System",
};

export default function RootLayout({ children }) {
  return (
    <html lang="th" suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
