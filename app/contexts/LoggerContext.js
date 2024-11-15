"use client";
import { createContext, useContext, useState, useEffect, useRef } from "react";

const LoggerContext = createContext();

export const LoggerProvider = ({ children }) => {
  const [realtimeLogs, setRealtimeLogs] = useState([]);
  const [combinedLogs, setCombinedLogs] = useState([]);
  const [firstMessageReceived, setFirstMessageReceived] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastFetchedTimestamp, setLastFetchedTimestamp] = useState(null);

  const socketRef = useRef(null); // Ref for the WebSocket
  const timeoutRef = useRef(null);
  const historicalLogsFetchedRef = useRef(false); // Track if historical logs are fetched
  const noMoreLogsRef = useRef(false); // Track if there are no more logs to fetch

  // WebSocket connection useEffect
  useEffect(() => {
    if (socketRef.current) return;
    const socket = new WebSocket("ws://localhost:8000/ws/log_entries/");
    socketRef.current = socket;

    socket.onopen = function () {
      console.log("WebSocket connection established");
      timeoutRef.current = setTimeout(() => {
        if (!firstMessageReceived) {
          console.log("No messages received after 5 seconds, fetching historical logs");
          fetchHistoricalLogs(null, 25);
        }
      }, 5000);
    };

    socket.onmessage = (event) => {
      try {
        const log = JSON.parse(event.data);

        if (!firstMessageReceived) {
          setFirstMessageReceived(true);
          if (timeoutRef.current) clearTimeout(timeoutRef.current);

          if (!historicalLogsFetchedRef.current) {
            fetchHistoricalLogs(log.timestamp, 25);
            historicalLogsFetchedRef.current = true; // Set to true after fetching logs
          }
        }

        if (realtimeLogs.length >= 50) {
          setRealtimeLogs((prevLogs) => prevLogs.slice(0, -1));
        }
        setRealtimeLogs((prevLogs) => [log, ...prevLogs]);
        setCombinedLogs((prevLogs) => [log, ...prevLogs]);
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
    if (noMoreLogsRef.current || isLoading) return; // Prevent fetch if already loading or no more logs

    setIsLoading(true);
    setError(null);

    try {
      const filterResponse = await fetch("http://localhost:8000/api/filter-type");
      if (filterResponse.ok || filterResponse.status === 304) {
        const filterData = await filterResponse.json();

        const baseUrl = "http://localhost:8000/api/historical-logs";
        const url = startDate
          ? `${baseUrl}?start=${startDate}&limit=${limit}`
          : `${baseUrl}?limit=${limit}`;

        const logResponse = await fetch(url, {
          method: "GET",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
        });

        if (!logResponse.ok) throw new Error(`HTTP error! status: ${logResponse.status}`);

        const logData = await logResponse.json();

        if (logData.length === 0) {
          noMoreLogsRef.current = true; // Set to true if no more logs are returned
          setIsLoading(false);
          return;
        }

        const mappedLogs = logData.map((log) => {
          const mappedLevel = filterData.levels.find(
            (level) => level.id === log.level
          )?.level_type || log.level;
          const mappedHost = filterData.hosts.find(
            (host) => host.id === log.host
          )?.host_name || log.host;
          const mappedRequestMethod = filterData.request_methods.find(
            (method) => method.id === log.request_method
          )?.request_method_type || log.request_method;

          return { ...log, level: mappedLevel, host: mappedHost, request_method: mappedRequestMethod };
        });

        setCombinedLogs((prevLogs) => [...prevLogs, ...mappedLogs]);
        setLastFetchedTimestamp(mappedLogs[mappedLogs.length - 1].timestamp);
        setIsLoading(false);
      } else {
        setError("Error fetching filter options.");
      }
    } catch (error) {
      console.error("Error fetching historical logs:", error);
      setError("Failed to fetch historical logs. Please try again.");
      setIsLoading(false);
    }
  }

  const fetchMoreLogs = (lastTimestamp, limit) => {
    if (!isLoading && !noMoreLogsRef.current) {
      console.log("Fetcghmore")
      fetchHistoricalLogs(lastTimestamp, limit);
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
        setCombinedLogs,
        setIsLoading,
        setError,
        setLastFetchedTimestamp,
      }}
    >
      {children}
    </LoggerContext.Provider>
  );
};

// Custom hook to use LoggerContext
export const useLogger = () => useContext(LoggerContext);
