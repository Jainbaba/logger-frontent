// LoggerBox.js
"use client";
import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  Box,
  TextField,
  Typography,
  Button,
  Alert,
  CircularProgress,
  Snackbar,
} from "@mui/material";
import { useLogger } from "../contexts/LoggerContext";
import {
  FiAlertCircle,
  FiInfo,
  FiCheckCircle,
  FiClipboard,
} from "react-icons/fi";
import Highlight from "react-highlight-words";
import FilterManager from "./FilterManager"; // Import the FilterManager component
import TimeRangeFilter from "./TimeRangeFilter";
import { green, red, yellow } from "@mui/material/colors";

const levelColors = {
  ERROR: "#f44336",
  INFO: "#2196f3",
  WARNING: "#ff9800",
};

// Helper function to format date strings and Unix timestamps
const formatDate = (dateStringOrTimestamp) => {
  const date =
    typeof dateStringOrTimestamp === "string"
      ? new Date(dateStringOrTimestamp)
      : new Date(dateStringOrTimestamp * 1000);

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
};

const LoggerBox = () => {
  const scrollContainerRef = useRef(null);
  const {
    combinedLogs,
    error,
    retryFetch,
    isLoading,
    fetchMoreLogs,
    setCombinedLogs,
    setIsLoading,
    setError,
    setLastFetchedTimestamp,
  } = useLogger();
  const [searchKeyword, setSearchKeyword] = useState("");
  const [firstLoad, setFirstLoad] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [loadingCustom, setLoadingCustom] = useState(false);

  // State for filters
  const [filters, setFilters] = useState([]);
  const [timeRange, setTimeRange] = useState(null);

  // Fetch logs based on the selected time range
  useEffect(() => {
    const fetchCustomLogs = async () => {
      if (timeRange) {
        setError(null);
        setLoadingCustom(true);
        try {
          console.log(timeRange);
          const filterResponse = await fetch(
            "http://13.127.229.179:8000/api/filter-type"
          );
          if (filterResponse.ok || filterResponse.status === 304) {
            const filterData = await filterResponse.json();

            const baseUrl = "http://13.127.229.179:8000/api/custom-logs";
            const url = `${baseUrl}?end=${timeRange}`;

            const logResponse = await fetch(url, {
              method: "GET",
              credentials: "include",
              headers: { "Content-Type": "application/json" },
            });

            if (!logResponse.ok)
              throw new Error(`HTTP error! status: ${logResponse.status}`);

            const logData = await logResponse.json();

            const mappedLogs = logData.map((log) => {
              const mappedLevel =
                filterData.levels.find((level) => level.id === log.level)
                  ?.level_type || log.level;
              const mappedHost =
                filterData.hosts.find((host) => host.id === log.host)
                  ?.host_name || log.host;
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

            setCombinedLogs([...mappedLogs]);
            setLastFetchedTimestamp(mappedLogs[mappedLogs.length - 1].timestamp);
          } else {
            console.log("Error fetching filter options.");
            setError("Error fetching filter options.");
          }
        } catch (error) {
          console.error("Error fetching historical logs:", error);
          setError("Failed to fetch historical logs. Please try again.");
        } finally  {
          setLoadingCustom(false);
        }
      }
    };
    fetchCustomLogs();
  }, [timeRange]);

  useEffect(() => {
    if (combinedLogs.length > 5) {
      setFirstLoad(false);
    }
  }, [combinedLogs]);

  const getIcon = (level) => {
    switch (level) {
      case "ERROR":
        return <FiAlertCircle style={{ color: red[500] }} />;
      case "WARNING":
        return <FiInfo style={{ color: yellow[700] }} />;
      case "INFO":
        return <FiCheckCircle style={{ color: green[500] }} />;
      default:
        return null;
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        setSnackbarMessage("Copied to clipboard!");
        setSnackbarOpen(true);
        setTimeout(() => setSnackbarOpen(false), 2000);
      })
      .catch((err) => {
        console.error("Could not copy text: ", err);
      });
  };

  const handleScroll = useCallback(async () => {
    if (scrollContainerRef.current && !isFetching) {
      const { scrollTop, scrollHeight, clientHeight } =
        scrollContainerRef.current;
      if (scrollHeight - scrollTop - clientHeight < scrollHeight * 0.05) {
        const lastLog = combinedLogs[combinedLogs.length - 1];
        if (lastLog) {
          const limit = Math.floor(combinedLogs.length * 0.25);
          setIsFetching(true);
          try {
            await fetchMoreLogs(lastLog.timestamp, limit);
          } catch (error) {
            console.error("Error fetching logs:", error);
          } finally {
            setIsFetching(false);
          }
        }
      }
    }
  }, [combinedLogs, fetchMoreLogs, isFetching]);

  // useEffect(() => {
  //   const scrollContainer = scrollContainerRef.current;
  //   if (scrollContainer) {
  //     scrollContainer.addEventListener("scroll", handleScroll);
  //   }
  //   return () => {
  //     if (scrollContainer) {
  //       scrollContainer.removeEventListener("scroll", handleScroll);
  //     }
  //   };
  // }, [handleScroll]);

  if (error) {
    return (
      <Box
        display="flex"
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        minHeight="400px"
        gap={2}
      >
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Button variant="contained" color="primary" onClick={retryFetch}>
          Retry
        </Button>
      </Box>
    );
  }

  if (loadingCustom) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="400px"
      >
        <CircularProgress />
        <Typography variant="body1" sx={{ ml: 2 }}>
          Loading Logs...
        </Typography>
      </Box>
    );
  }


  if (firstLoad  && isLoading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="400px"
      >
        <CircularProgress />
        <Typography variant="body1" sx={{ ml: 2 }}>
          Loading Logs...
        </Typography>
      </Box>
    );
  }

  const filteredLogs = combinedLogs.filter((log) => {
    // Check if log matches all active filters
    const matchesFilters = filters.every((filter) => {
      const logValue = log[filter.type]; // Access the log value for the filter type

      // Check if the log has the filter type as a direct property or nested
      if (logValue) {
        return logValue === filter.value; // Match filter value exactly
      } else {
        console.warn(
          `Log does not have property '${filter.type} : ${filter.value}' ${log} `
        );
        return false; // Filter out logs that don't match
      }
    });

    // Check if log entry matches the search keyword
    const matchesKeyword = log.log_string
      .toLowerCase()
      .includes(searchKeyword.toLowerCase());

    return matchesFilters && (!searchKeyword || matchesKeyword);
  });

  return (
    <Box
      ref={scrollContainerRef}
      sx={{
        maxHeight: "800px",
        overflowY: "auto",
        display: "flex",
        flexDirection: "column",
        gap: 2,
        position: "relative",
      }}
    >
      <TextField
        variant="outlined"
        placeholder="Search logs..."
        value={searchKeyword}
        onChange={(e) => setSearchKeyword(e.target.value)}
        sx={{ mb: 2 }}
      />
      <FilterManager
        filters={filters}
        setFilters={setFilters}
        combinedLogs={combinedLogs}
      />{" "}
      <TimeRangeFilter setTimeRange={setTimeRange} />
      {filteredLogs.map((log, index) => {
        const logEntryString = `${log.log_string}`;
        const formattedDate = formatDate(log.date_time || log.timestamp);
        return (
          <Box
            key={index}
            display="flex"
            alignItems="center"
            borderRadius="4px"
            p={1}
            width="100%"
            position="relative"
            sx={{ "&:hover .copy-icon": { display: "block" } }}
          >
            <Box
              flex="1"
              display="flex"
              flexDirection="row"
              alignItems="center"
              sx={{ whiteSpace: "nowrap" }}
            >
              <Typography variant="body2" color="textSecondary">
                {formattedDate}
              </Typography>
              <Box flex="0 0 auto" mr={1} ml={1}>
                {getIcon(log.level)}
              </Box>
              <Typography variant="body2">
                <Highlight
                  searchWords={searchKeyword.length >= 3 ? [searchKeyword] : []}
                  autoEscape
                  textToHighlight={logEntryString}
                  highlightStyle={{
                    backgroundColor: "yellow",
                    fontWeight: "bold",
                  }}
                />
              </Typography>
              <Box
                className="copy-icon"
                position="absolute"
                right={30}
                sx={{
                  cursor: "pointer",
                  color: "#333333",
                  display: "none",
                }}
              >
                <FiClipboard onClick={() => copyToClipboard(logEntryString)} />
              </Box>
            </Box>
          </Box>
        );
      })}
      <Snackbar
        open={snackbarOpen}
        onClose={() => setSnackbarOpen(false)}
        message={snackbarMessage}
        autoHideDuration={2000}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      />
    </Box>
  );
};

export default LoggerBox;
