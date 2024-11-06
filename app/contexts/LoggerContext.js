"use client";
import { createContext, useContext, useState, useEffect, useRef } from "react";

const LoggerContext = createContext();

export const LoggerProvider = ({ children }) => {
  const [realtimeLogs, setRealtimeLogs] = useState([]);
  const [combinedLogs, setCombinedLogs] = useState([]);
  const [firstMessageReceived, setFirstMessageReceived] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastFetchedTimestamp, setLastFetchedTimestamp] = useState(null);
  
  const socketRef = useRef(null); // Ref for the WebSocket

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  useEffect(() => {
    setFirstMessageReceived(false); // Reset state on mount
  }, []);

  // WebSocket connection useEffect
  useEffect(() => {
    if (socketRef.current) return; // Prevent opening socket multiple times

    const socket = new WebSocket("ws://localhost:8000/ws/log_entries/");
    socketRef.current = socket; // Store the socket in the ref

    socket.onopen = function () {
      console.log("WebSocket connection established");
      sleep(1000);
    };

    socket.onmessage = (event) => {
      try {
        const log = JSON.parse(event.data);

        if (!firstMessageReceived) {
          setFirstMessageReceived(true);
          fetchHistoricalLogs(log.timestamp, 25); // Fetch logs on first message
        }

        if (realtimeLogs.length >= 50) {
          setRealtimeLogs((prevLogs) => prevLogs.slice(0, -1));
        }
        setRealtimeLogs((prevLogs) => [log, ...prevLogs]);
      } catch (error) {
        console.error("Error parsing log data:", error);
        setError("Error parsing log");
      }
    };

    socket.onclose = function (event) {
      console.log("WebSocket connection closed:", event);
      setError("WebSocket connection closed");
    };

    socket.onerror = (error) => {
      console.log("WebSocket error:", error);
      setError("WebSocket error");
    };

    return () => {
      socketRef.current?.close();
    };
  }, []); // Empty dependency array to ensure WebSocket is opened only once

  async function fetchHistoricalLogs(startDate = null, limit = 25) {
    setIsLoading(true);
    setError(null);
    try {
      // Fetch filter options
      const filterResponse = await fetch(
        "http://localhost:8000/api/filter-type"
      ); // Adjust URL as needed

      if (filterResponse.ok || filterResponse.status === 304) {
        const filterData = await filterResponse.json();
        try {
          // Fetch historical logs
          const baseUrl = "http://localhost:8000/api/historical-logs";
          const url = startDate
            ? `${baseUrl}?start=${startDate}&limit=${limit}`
            : `${baseUrl}?limit=${limit}`;

          const logResponse = await fetch(url, {
            method: "GET",
            credentials: "include",
            headers: {
              "Content-Type": "application/json",
            },
          });

          if (!logResponse.ok)
            throw new Error(`HTTP error! status: ${logResponse.status}`);

          const logData = await logResponse.json();

          // Map logs to filter data
          const mappedLogs = logData.map((log) => {
            // Match log.level to filterData.levels array
            const mappedLevel = filterData.levels.find(
              (level) => level.id === log.level
            )?.level_type || log.level; // Use the label of the matched level or fall back to the log.level itself

            // Similarly map host and request_method
            const mappedHost = filterData.hosts.find(
              (host) => host.id === log.host
            )?.host_name || log.host;

            const mappedRequestMethod =
              filterData.request_methods.find(
                (method) => method.id === log.request_method
              )?.request_method_type || log.request_method;

            return {
              ...log,
              level: mappedLevel,
              host: mappedHost,
              request_method: mappedRequestMethod,
            };
          });
          setCombinedLogs((prevLogs) => [...prevLogs, ...mappedLogs]);
          setLastFetchedTimestamp(mappedLogs[mappedLogs.length - 1].timestamp); // Adjust according to your timestamp field
          setIsLoading(false);
        } catch (error) {
          console.error("Error fetching historical logs:", error);
          setError("Failed to fetch historical logs. Please try again.");
          setIsLoading(false);
        }
      } else {
        setError("Error fetching filter options.");
      }
    } catch (error) {
      setError("Error fetching filter options.");
    }
  }

  const fetchMoreLogs = (lastTimestamp, limit) => {
    if (!isLoading) {
      fetchHistoricalLogs(lastTimestamp, limit);
      setLastFetchedTimestamp(combinedLogs[combinedLogs.length - 1].timestamp);
    }
  };

  const retryFetch = () => {
    setError(null);
    window.location.reload();
  };

  return (
    <LoggerContext.Provider
      value={{
        combinedLogs,
        isLoading,
        error,
        retryFetch,
        fetchMoreLogs,
        lastFetchedTimestamp,
        setLastFetchedTimestamp,
      }}
    >
      {children}
    </LoggerContext.Provider>
  );
};

// Create a custom hook to use the LoggerContext
export const useLogger = () => useContext(LoggerContext);
