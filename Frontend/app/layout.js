import "./globals.css";
import ReminderToast from "../components/reminders/ReminderToast";

export const metadata = {
  title: "AuraLearn | Emotion-Aware Learning Platform",
  description: "Adaptive study reminder and emotion-aware learning experience for student focus and retention.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
        <ReminderToast />
      </body>