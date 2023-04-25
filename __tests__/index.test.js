const axios = require("axios");
const fs = require("fs");
const { sendEmail } = require("../index");

jest.mock("axios");
jest.mock("fs");

describe("sendEmail() tests", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("should generate and send the pdf through a post api call", async () => {
    axios.post.mockResolvedValue({});

    fs.createReadStream.mockReturnValue("dummy pdf");

    const emails = ["email1@gmail.com", "email2@gmail.com"];

    await sendEmail(emails, (testing = true));

    expect(axios.post).toHaveBeenCalledWith(
      "https://127.0.0.1:9001/v1/mail-server/send/bulk-mail",
      expect.anything(),
      {
        "Content-Type": "multipart/form-data",
      }
    );
  });

  it("should handle errors when sending email", async () => {
    axios.post.mockRejectedValue(new Error("Network error"));

    fs.createReadStream.mockReturnValue("some pdf");

    const emails = ["email1@gmail.com", "email2@gmail.com"];

    await sendEmail(emails, (testing = true));

    expect(axios.post).toHaveBeenCalledWith(
      "https://127.0.0.1:9001/v1/mail-server/send/bulk-mail",
      expect.anything(),
      {
        "Content-Type": "multipart/form-data",
      }
    );
  });
});
