import express from "express";
import http from "http";
import request from "supertest";
import jwt from "jsonwebtoken";

describe("movie upload proxy routes", () => {
  let coreApp: express.Express;
  let coreServer: http.Server;

  beforeAll(async () => {
    process.env.JWT_SECRET = process.env.JWT_SECRET || "test-secret";

    coreApp = express();
    coreApp.use(express.json());

    coreApp.get("/api/upload-url", (req, res) => {
      res.json({
        path: req.path,
        query: req.query,
        userId: req.header("x-user-id"),
      });
    });

    coreApp.post("/api/upload-confirm", (req, res) => {
      res.json({
        path: req.path,
        body: req.body,
        userId: req.header("x-user-id"),
      });
    });

    await new Promise<void>((resolve) => {
      coreServer = coreApp.listen(0, () => {
        const address = coreServer.address();
        if (address && typeof address === "object") {
          process.env.CORE_SERVICE_URL = `http://127.0.0.1:${address.port}`;
        }
        resolve();
      });
    });
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => {
      coreServer.close((err) => (err ? reject(err) : resolve()));
    });
  });

  async function loadApp() {
    jest.resetModules();
    const mod = require("../app");
    return mod.app;
  }

  function makeToken(userId: string) {
    return jwt.sign({ sub: userId }, process.env.JWT_SECRET as string);
  }

  it("rejects unauthenticated upload-url requests", async () => {
    const app = await loadApp();

    const res = await request(app).get(
      "/CineMatch/movies/123/upload-url?filename=image.png"
    );

    expect(res.status).toBe(401);
  });

  it("injects the authenticated user id into upload-url proxy requests", async () => {
    const app = await loadApp();
    const client = request(app);
    const userId = "user-123";
    const accessToken = makeToken(userId);

    const res = await client
      .get("/CineMatch/movies/123/upload-url?filename=image.png")
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(200);

    expect(res.body.path).toBe("/api/upload-url");
    expect(res.body.query).toMatchObject({
      filename: "image.png",
    });
    expect(res.body.userId).toBe(userId);
  });

  it("injects the authenticated user id into confirm-upload proxy requests", async () => {
    const app = await loadApp();
    const client = request(app);
    const userId = "user-456";
    const accessToken = makeToken(userId);

    const payload = {
      movie_id: 123,
      file_key: "posters/test.png",
    };

    const res = await client
      .post("/CineMatch/movies/123/confirm-upload")
      .set("Authorization", `Bearer ${accessToken}`)
      .send(payload)
      .expect(200);

    expect(res.body.path).toBe("/api/upload-confirm");
    expect(res.body.body).toMatchObject(payload);
    expect(res.body.userId).toBe(userId);
  });
});
