import { useEffect, useState } from "react";
import api from "../services/api";

interface ComposeEmailProps {
  onClose: () => void;
}

interface Sender {
  id: string;
  email: string;
}

export default function ComposeEmail({
  onClose,
}: ComposeEmailProps) {
  const [senders, setSenders] = useState<Sender[]>([]);
  const [senderId, setSenderId] = useState("");

  const [newSenderEmail, setNewSenderEmail] = useState("");
  const [showAddSender, setShowAddSender] = useState(false);
  const [addingSender, setAddingSender] = useState(false);

  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [startTime, setStartTime] = useState("");
  const [delay, setDelay] = useState("1");
  const [hourlyLimit, setHourlyLimit] = useState("100");

  const [recipients, setRecipients] = useState<string[]>([]);
  const [recipientCount, setRecipientCount] = useState(0);

  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState("");

  /*
   * Load logged-in user
   */
  useEffect(() => {
    const loadUser = async () => {
      try {
        const response = await api.get("/auth/me");

        const loggedInUser = response.data.user;

        setUserId(loggedInUser.id);
      } catch (error) {
        console.error(
          "Failed to load user:",
          error
        );
      }
    };

    loadUser();
  }, []);

  /*
   * Load senders
   */
  const loadSenders = async () => {
    if (!userId) return;

    try {
      const response = await api.get(
        `/senders?userId=${userId}`
      );

      const senderList =
        response.data.senders || [];

      setSenders(senderList);

      if (
        senderList.length > 0 &&
        !senderId
      ) {
        setSenderId(senderList[0].id);
      }
    } catch (error) {
      console.error(
        "Failed to load senders:",
        error
      );
    }
  };

  useEffect(() => {
    if (userId) {
      loadSenders();
    }
  }, [userId]);

  /*
   * Add new sender
   */
  const handleAddSender = async () => {
    const email =
      newSenderEmail.trim().toLowerCase();

    if (!email) {
      alert("Please enter a sender email.");
      return;
    }

    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        email
      )
    ) {
      alert("Please enter a valid email address.");
      return;
    }

    try {
      setAddingSender(true);

      const response = await api.post(
        "/senders",
        {
          email,
        }
      );

      const newSender = response.data.sender;

      if (newSender) {
        setSenders((previous) => [
          ...previous,
          newSender,
        ]);

        setSenderId(newSender.id);
      } else {
        await loadSenders();
      }

      setNewSenderEmail("");
      setShowAddSender(false);

      alert("Sender added successfully!");
    } catch (error: any) {
      console.error(
        "Failed to add sender:",
        error
      );

      alert(
        error?.response?.data?.message ||
          "Failed to add sender."
      );
    } finally {
      setAddingSender(false);
    }
  };

  /*
   * Read CSV / TXT file
   */
  const handleFileChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file =
      event.target.files?.[0];

    if (!file) return;

    const reader = new FileReader();

    reader.onload = () => {
      const text = String(
        reader.result || ""
      );

      const emails = text
        .split(/[\s,;]+/)
        .map((value) =>
          value.trim().toLowerCase()
        )
        .filter((value) =>
          /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
            value
          )
        );

      const uniqueEmails = [
        ...new Set(emails),
      ];

      console.log(
        "FILE CONTENT:",
        text
      );

      console.log(
        "PARSED EMAILS:",
        uniqueEmails
      );

      setRecipients(uniqueEmails);
      setRecipientCount(
        uniqueEmails.length
      );
    };

    reader.readAsText(file);
  };

  /*
   * Schedule campaign
   */
  const handleSchedule = async () => {
    if (!userId) {
      alert(
        "User information is not available."
      );
      return;
    }

    if (!senderId) {
      alert("Please select a sender.");
      return;
    }

    if (
      !subject ||
      !body ||
      !startTime
    ) {
      alert(
        "Please fill subject, body and start time."
      );
      return;
    }

    if (recipients.length === 0) {
      alert(
        "Please upload a file with email addresses."
      );
      return;
    }

    try {
      setLoading(true);

      const response = await api.post(
        "/campaigns/schedule",
        {
          senderId,
          subject,
          body,
          recipients,
          startTime,
          delaySeconds: Number(delay),
          hourlyLimit: Number(hourlyLimit),
        }
      );

      console.log(response.data);

      alert(
        "Campaign scheduled successfully!"
      );

      onClose();
    } catch (error) {
      console.error(error);

      alert(
        "Failed to schedule campaign."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              Compose New Email
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Create and schedule an email campaign
            </p>
          </div>

          <button
            onClick={onClose}
            className="text-2xl text-slate-400 hover:text-slate-700"
          >
            ×
          </button>
        </div>

        {/* Form */}
        <div className="space-y-5 p-6">

          {/* Sender */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="block text-sm font-semibold text-slate-700">
                Sender
              </label>

              <button
                type="button"
                onClick={() =>
                  setShowAddSender(
                    !showAddSender
                  )
                }
                className="text-sm font-semibold text-purple-600 hover:text-purple-700"
              >
                + Add Sender
              </button>
            </div>

            <select
              value={senderId}
              onChange={(e) =>
                setSenderId(
                  e.target.value
                )
              }
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-3 text-sm"
            >
              {senders.map((sender) => (
                <option
                  key={sender.id}
                  value={sender.id}
                >
                  {sender.email}
                </option>
              ))}
            </select>

            {/* Add Sender */}
            {showAddSender && (
              <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  New Sender Email
                </label>

                <div className="flex gap-2">
                  <input
                    type="email"
                    value={newSenderEmail}
                    onChange={(e) =>
                      setNewSenderEmail(
                        e.target.value
                      )
                    }
                    placeholder="sender@example.com"
                    className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-900"
                  />

                  <button
                    type="button"
                    onClick={handleAddSender}
                    disabled={addingSender}
                    className="rounded-lg bg-purple-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {addingSender
                      ? "Adding..."
                      : "Add"}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Recipients */}
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Recipients
            </label>

            <input
              type="file"
              accept=".csv,.txt"
              onChange={handleFileChange}
              className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />

            <p className="mt-2 text-sm text-slate-500">
              {recipientCount > 0
                ? `${recipientCount} unique email addresses found`
                : "Upload a CSV or TXT file containing email addresses"}
            </p>
          </div>

          {/* Subject */}
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Subject
            </label>

            <input
              value={subject}
              onChange={(e) =>
                setSubject(
                  e.target.value
                )
              }
              placeholder="Enter email subject"
              className="w-full rounded-lg border border-slate-300 px-3 py-3 text-sm outline-none focus:border-slate-900"
            />
          </div>

          {/* Body */}
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Email Body
            </label>

            <textarea
              value={body}
              onChange={(e) =>
                setBody(
                  e.target.value
                )
              }
              placeholder="Write your email..."
              rows={7}
              className="w-full resize-none rounded-lg border border-slate-300 px-3 py-3 text-sm outline-none focus:border-slate-900"
            />
          </div>

          {/* Start time */}
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Start Time
            </label>

            <input
              type="datetime-local"
              value={startTime}
              onChange={(e) =>
                setStartTime(
                  e.target.value
                )
              }
              className="w-full rounded-lg border border-slate-300 px-3 py-3 text-sm"
            />
          </div>

          {/* Delay + hourly limit */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Delay Between Emails
              </label>

              <div className="flex">
                <input
                  type="number"
                  min="0"
                  value={delay}
                  onChange={(e) =>
                    setDelay(
                      e.target.value
                    )
                  }
                  className="w-full rounded-l-lg border border-slate-300 px-3 py-3 text-sm"
                />

                <span className="flex items-center rounded-r-lg border border-l-0 border-slate-300 bg-slate-50 px-3 text-sm text-slate-500">
                  sec
                </span>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Hourly Email Limit
              </label>

              <input
                type="number"
                min="1"
                value={hourlyLimit}
                onChange={(e) =>
                  setHourlyLimit(
                    e.target.value
                  )
                }
                className="w-full rounded-lg border border-slate-300 px-3 py-3 text-sm"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 border-t border-slate-200 pt-5">

            <button
              onClick={onClose}
              disabled={loading}
              className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>

            <button
              onClick={handleSchedule}
              disabled={loading}
              className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading
                ? "Scheduling..."
                : "Schedule Campaign"}
            </button>

          </div>
        </div>
      </div>
    </div>
  );
}