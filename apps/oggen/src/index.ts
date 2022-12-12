import { render } from "./render";
import * as express from "express";
import * as path from "path";

const app = express();
const port = 5052 || process.env.PORT;

app.get("/", async (req, res) => {
  const title = req.query.title as string | undefined;

  if (!title) return res.sendStatus(400);
  const filename = await render(title);
  res.sendFile(path.join(filename), {
    root: path.join(__dirname, "..", "_cache"),
  });
});

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});
