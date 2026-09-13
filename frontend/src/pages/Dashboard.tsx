import { useEffect, useState } from "react";
import ComposeEmail from "../components/ComposeEmail";
import api from "../services/api";

interface Email {
  id: string;
  recipient: string;
  subject: string;
  scheduledAt: string;
  sentAt: string | null;
  status: string;
  body?: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
}

interface SlackChannel {
  id: string;
  name: string;
}

export default function Dashboard() {
  const [showCompose, setShowCompose] = useState(false);

  const [emails, setEmails] = useState<Email[]>([]);
  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState<
    "scheduled" | "sent"
  >("scheduled");

  const [user, setUser] = useState<User | null>(null);

  const [slackChannels, setSlackChannels] = useState<
    SlackChannel[]
  >([]);

  const [selectedSlackChannel, setSelectedSlackChannel] =
    useState("");

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Email[]>([]);
  const [searching, setSearching] = useState(false);
  const [isSearchActive, setIsSearchActive] = useState(false);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const params = new URLSearchParams(
          window.location.search
        );

        const urlToken = params.get("token");

        if (urlToken) {
          localStorage.setItem("token", urlToken);

          window.history.replaceState(
            {},
            document.title,
            "/dashboard"
          );
        }

        const token = localStorage.getItem("token");

        if (!token) {
          window.location.href = "/";
          return;
        }

        const response = await api.get("/auth/me", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        setUser(response.data.user);
      } catch (error) {
        console.error("Failed to load user:", error);

        localStorage.removeItem("token");
        window.location.href = "/";
      }
    };

    loadUser();
  }, []);

  const loadSlackChannels = async () => {
    try {
      if (!user) return;

      const response = await api.get(
        `/slack/channels?userId=${user.id}`
      );

      const channels = response.data.channels || [];

      setSlackChannels(channels);

      if (channels.length > 0) {
        const firstChannel = channels[0];

        setSelectedSlackChannel(firstChannel.id);

        await api.post("/slack/channel", {
          userId: user.id,
          channelId: firstChannel.id,
          channelName: firstChannel.name,
        });

        console.log(
          "Default Slack channel saved:",
          firstChannel.name
        );
      }
    } catch (error) {
      console.error(
        "Failed to load/save Slack channels:",
        error
      );
    }
  };

  useEffect(() => {
    if (user) {
      loadSlackChannels();
    }
  }, [user]);

  const loadEmails = async () => {
    try {
      setLoading(true);

      const endpoint =
        activeTab === "scheduled"
          ? "/emails/scheduled"
          : "/emails/sent";

      const response = await api.get(endpoint);

      setEmails(response.data.emails || []);
      setSearchResults([]);
      setIsSearchActive(false);
    } catch (error) {
      console.error("Failed to load emails:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEmails();
  }, [activeTab]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setIsSearchActive(false);
      return;
    }

    try {
      setSearching(true);

      const response = await api.get(
        `/emails/search?q=${encodeURIComponent(searchQuery)}`
      );

      const results = response.data.results || [];

      const formattedResults: Email[] = results.map(
        (item: any) => item._source
      );

      setSearchResults(formattedResults);
      setIsSearchActive(true);
    } catch (error) {
      console.error("Search failed:", error);

      setSearchResults([]);
      setIsSearchActive(true);
    } finally {
      setSearching(false);
    }
  };

  const clearSearch = () => {
    setSearchQuery("");
    setSearchResults([]);
    setIsSearchActive(false);
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    window.location.href = "/";
  };

  const handleSlackChannelChange = async (
    channelId: string
  ) => {
    setSelectedSlackChannel(channelId);

    if (!user) return;

    const channel = slackChannels.find(
      (item) => item.id === channelId
    );

    if (!channel) return;

    try {
      await api.post("/slack/channel", {
        userId: user.id,
        channelId: channel.id,
        channelName: channel.name,
      });

      console.log(
        "Slack channel saved:",
        channel.name
      );
    } catch (error) {
      console.error(
        "Failed to save Slack channel:",
        error
      );
    }
  };

  const handleConnectSlack = () => {
    if (!user) return;

    window.location.href =
      `http://localhost:5000/api/slack/connect?userId=${user.id}`;
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString();
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  };

  const displayedEmails = isSearchActive
    ? searchResults
    : emails;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="flex items-center justify-between px-8 py-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              ReachInbox
            </h1>

            <p className="text-xs text-slate-500">
              Email Scheduler
            </p>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={selectedSlackChannel}
              onChange={(e) =>
                handleSlackChannelChange(
                  e.target.value
                )
              }
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
            >
              {slackChannels.length === 0 ? (
                <option value="">
                  No channels
                </option>
              ) : (
                slackChannels.map((channel) => (
                  <option
                    key={channel.id}
                    value={channel.id}
                  >
                    #{channel.name}
                  </option>
                ))
              )}
            </select>

            <button
              onClick={handleConnectSlack}
              className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700"
            >
              Connect Slack
            </button>
          </div>

          <div className="flex items-center gap-3">
            {user?.avatar ? (
              <img
                src={user.avatar}
                alt={user.name}
                className="h-10 w-10 rounded-full"
              />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">
                {user
                  ? getInitials(user.name)
                  : "U"}
              </div>
            )}

            <div>
              <p className="text-sm font-semibold text-slate-900">
                {user?.name || "Loading..."}
              </p>

              <p className="text-xs text-slate-500">
                {user?.email || ""}
              </p>
            </div>

            <button
              onClick={handleLogout}
              className="ml-4 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-8 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">
              Emails
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Manage your scheduled and sent emails
            </p>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) =>
                setSearchQuery(e.target.value)
              }
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleSearch();
                }
              }}
              placeholder="Search emails..."
              className="w-64 rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-slate-500"
            />

            <button
              onClick={handleSearch}
              className="rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              {searching
                ? "Searching..."
                : "Search"}
            </button>

            {isSearchActive && (
              <button
                onClick={clearSearch}
                className="rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Clear
              </button>
            )}

            <button
              onClick={() => setShowCompose(true)}
              className="rounded-lg bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-slate-800"
            >
              + Compose New Email
            </button>
          </div>
        </div>

        {isSearchActive && (
          <div className="mb-4 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
            Search results for{" "}
            <span className="font-semibold text-slate-900">
              "{searchQuery}"
            </span>
            : {searchResults.length}
          </div>
        )}

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          {!isSearchActive && (
            <div className="flex border-b border-slate-200 px-6">
              <button
                onClick={() =>
                  setActiveTab("scheduled")
                }
                className={
                  activeTab === "scheduled"
                    ? "border-b-2 border-slate-900 px-2 py-4 text-sm font-semibold text-slate-900"
                    : "px-2 py-4 text-sm font-medium text-slate-500 hover:text-slate-900"
                }
              >
                Scheduled Emails
              </button>

              <button
                onClick={() =>
                  setActiveTab("sent")
                }
                className={
                  activeTab === "sent"
                    ? "ml-6 border-b-2 border-slate-900 px-2 py-4 text-sm font-semibold text-slate-900"
                    : "ml-6 px-2 py-4 text-sm font-medium text-slate-500 hover:text-slate-900"
                }
              >
                Sent Emails
              </button>
            </div>
          )}

          {loading && !isSearchActive && (
            <div className="flex min-h-[350px] items-center justify-center">
              <p className="text-sm text-slate-500">
                Loading emails...
              </p>
            </div>
          )}

          {isSearchActive &&
            searching && (
              <div className="flex min-h-[350px] items-center justify-center">
                <p className="text-sm text-slate-500">
                  Searching emails...
                </p>
              </div>
            )}

          {!loading &&
            !searching &&
            displayedEmails.length === 0 && (
              <div className="flex min-h-[350px] flex-col items-center justify-center px-6 text-center">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-2xl">
                  ✉
                </div>

                <h3 className="text-lg font-semibold text-slate-900">
                  {isSearchActive
                    ? "No matching emails"
                    : activeTab === "scheduled"
                    ? "No scheduled emails"
                    : "No sent emails"}
                </h3>

                <p className="mt-2 max-w-md text-sm text-slate-500">
                  {isSearchActive
                    ? "Try searching for a different email address, subject, or message."
                    : activeTab === "scheduled"
                    ? "Your scheduled emails will appear here once you create an email campaign."
                    : "Emails that have been successfully sent will appear here."}
                </p>

                {!isSearchActive &&
                  activeTab === "scheduled" && (
                    <button
                      onClick={() =>
                        setShowCompose(true)
                      }
                      className="mt-6 rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
                    >
                      Compose your first email
                    </button>
                  )}
              </div>
            )}

          {!loading &&
            !searching &&
            displayedEmails.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-left">
                      <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Email
                      </th>

                      <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Subject
                      </th>

                      <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        {isSearchActive
                          ? "Scheduled / Sent Time"
                          : activeTab === "scheduled"
                          ? "Scheduled Time"
                          : "Sent Time"}
                      </th>

                      <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Status
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {displayedEmails.map(
                      (email) => (
                        <tr
                          key={email.id}
                          className="border-b border-slate-100 last:border-0 hover:bg-slate-50"
                        >
                          <td className="px-6 py-4 text-sm text-slate-700">
                            {email.recipient}
                          </td>

                          <td className="px-6 py-4 text-sm font-medium text-slate-900">
                            {email.subject}
                          </td>

                          <td className="px-6 py-4 text-sm text-slate-500">
                            {isSearchActive
                              ? formatDate(
                                  email.sentAt ||
                                    email.scheduledAt
                                )
                              : formatDate(
                                  activeTab ===
                                    "scheduled"
                                    ? email.scheduledAt
                                    : email.sentAt ||
                                      email.scheduledAt
                                )}
                          </td>

                          <td className="px-6 py-4">
                            <span
                              className={
                                email.status ===
                                "SENT"
                                  ? "rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700"
                                  : email.status ===
                                    "FAILED"
                                  ? "rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700"
                                  : "rounded-full bg-yellow-100 px-3 py-1 text-xs font-semibold text-yellow-700"
                              }
                            >
                              {email.status}
                            </span>
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>
            )}
        </div>
      </main>

      {showCompose && (
        <ComposeEmail
          onClose={() => {
            setShowCompose(false);
            loadEmails();
          }}
        />
      )}
    </div>
  );
}