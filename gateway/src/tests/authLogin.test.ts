import request from "supertest";
import {app} from "../app";

describe("POST /CineMatch/auth/login", () => {
  it("should fail with 401 for unregistered email", async () => {
    const res = await request(app)
      .post("/CineMatch/auth/login")
      .send({ email: "noone_" + Date.now() + "@mail.com", password: "Password123!" });

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty("error", "INVALID_CREDENTIALS");
  });

  it("should fail with 401 for incorrect password", async () => {
    const email = `user_${Date.now()}@mail.com`;

    // register first
    await request(app)
      .post("/CineMatch/auth/register")
      .send({ email, password: "Password123!" })
      .expect(201);

    // wrong password
    const res = await request(app)
      .post("/CineMatch/auth/login")
      .send({ email, password: "WrongPass123!" });

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty("error", "INVALID_CREDENTIALS");
  });
});