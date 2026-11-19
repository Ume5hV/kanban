# Website hooks (inlined in the pages)

Source files in this folder are inlined (between `HOOK:` comment markers) at the end of `index.html`, `dc.html` and `devops.html`, because the project is single-file with no external resources. After editing a source file, re-inline it into each page.

| Hook | File | Behaviour |
|---|---|---|
| Meeting reminder | `meeting-reminder.js` | After 10 s on the page, an accessible dialog says: IT meeting next Wednesday 10:00 AM, Room 888. Once per page load; OK or Esc closes it. |
| IT assistant chatbot | `it-assistant-chatbot.js` | Cute avatar button bottom-right. Click opens a text chat and speaks "I am your IT assistant, how can i help you?" (Web Speech API; mute toggle in the panel). Answers use retrieval over a built-in knowledge base plus the live board tasks. |
