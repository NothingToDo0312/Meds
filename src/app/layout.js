import "./globals.css";

export const metadata = { title: "MediReminder", description: "Medicine reminders and dose tracking" };
export const viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#0f766e" };

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Apply the saved theme before first paint so there is no light/dark flash. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem("mr_theme");if(t!=="light"&&t!=="dark")t=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";document.documentElement.dataset.theme=t}catch(e){}`,
          }}
        />
        {/* Keep the browser's install prompt so the in-app Install button can use it later. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `addEventListener("beforeinstallprompt",function(e){e.preventDefault();window.__mrInstall=e;dispatchEvent(new Event("mr:install"))})`,
          }}
        />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
