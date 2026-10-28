import { createRoot } from "react-dom/client";
import { Reminders } from "../src/reminders/Reminders";
import { localDate } from "../src/lib";
import { addDays } from "../src/reminders/model";
import "../src/style.css";
const today = localDate();
createRoot(document.getElementById("root")!).render(
  <main style={{ padding: 16 }}>
    <Reminders
      memberId="a0000000-0000-4000-8000-000000000001"
      online={true}
      trips={[
        {
          id: "b0000000-0000-4000-8000-000000000001",
          version: 1,
          created_by: null,
          updated_by: null,
          name: "Bogor weekend",
          city: "Bogor",
          start_date: addDays(today, 4),
          end_date: addDays(today, 6),
          timezone: "Asia/Jakarta",
          archived: false,
          cover_path: null,
        },
      ]}
    />
  </main>,
);
