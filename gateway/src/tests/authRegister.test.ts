import request from "supertest";
import {app} from "../app";

describe("POST /CineMatch/auth/register", () => {
  it("should fail with 400 for duplicate email", async () => {
    const email = `dup_${Date.now()}@mail.com`;
    const password = "Password123!";

    await request(app)
      .post("/CineMatch/auth/register")
      .send({ email, password })
      .expect(201);

    const res = await request(app)
      .post("/CineMatch/auth/register")
      .send({ email, password });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error", "EMAIL_ALREADY_EXISTS");
  });
});