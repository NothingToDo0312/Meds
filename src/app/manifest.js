// Lets MediReminder be installed on a phone or desktop, which makes reminders more reliable.
export default function manifest() {
  return {
    name: "MediReminder",
    short_name: "MediReminder",
    description: "Medicine reminders and dose tracking",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#0f766e",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
