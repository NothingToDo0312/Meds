import "./globals.css";

export const metadata = { title: "MediReminder", description: "Medicine reminders and dose tracking" };
export const viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#0f766e" };

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
