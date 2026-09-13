import { Router } from "express";
import multer from "multer";
import { parseRecipients } from "../services/recipientParserService.js";

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 2 * 1024 * 1024,
  },
});

router.post(
  "/parse",
  upload.single("file"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          status: "error",
          message: "No file uploaded",
        });
      }

      const fileContent =
        req.file.buffer.toString("utf-8");

      const emails = parseRecipients(fileContent);

      res.json({
        status: "success",
        count: emails.length,
        emails,
      });
    } catch (error) {
      console.error(error);

      res.status(400).json({
        status: "error",
        message: "Failed to parse recipient file",
      });
    }
  }
);

export default router;