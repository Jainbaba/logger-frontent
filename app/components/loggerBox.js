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
import { FiAlertCircle, FiInfo, FiCheckCircle, FiClipboard } from "react-icons/fi";
import Highlight from "react-highlight-words";
import FilterManager from "./FilterManager"; // Import the FilterManager component

const levelColors = {
  ERROR: "#f44336",
  INFO: "#2196f3",
  WARNING: "#ff9800",
};

// Helper function to format date strings and Unix timestamps
const formatDate = (dateStringOrTimestamp) => {
  const date = typeof dateStringOrTimestamp === "string"
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
  const { combinedLogs, error, retryFetch, isLoading, fetchMoreLogs } = useLogger();
  const [searchKeyword, setSearchKeyword] = useState("");
  const [firstLoad, setFirstLoad] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");

  // State for filters
  const [filters, setFilters] = useState([]);

  useEffect(() => {
    if (combinedLogs.length > 5) {
      setFirstLoad(false);
    }
  }, [combinedLogs]);

  const getIcon = (level) => {
    switch (level) {
      case "ERROR":
        return <FiAlertCircle style={{ color: levelColors.error }} />;
      case "WARNING":
        return <FiInfo style={{ color: levelColors.warning }} />;
      case "INFO":
        return <FiCheckCircle style={{ color: levelColors.info }} />;
      default:
        return null;
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      setSnackbarMessage("Copied to clipboard!");
      setSnackbarOpen(true);
      setTimeout(() => setSnackbarOpen(false), 2000);
    }).catch((err) => {
      console.error("Could not copy text: ", err);
    });
  };

  const handleScroll = useCallback(async () => {
    if (scrollContainerRef.current && !isFetching) {
      const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
      if (scrollHeight - scrollTop - clientHeight < scrollHeight * 0.1) {
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

  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (scrollContainer) {
      scrollContainer.addEventListener("scroll", handleScroll);
    }
    return () => {
      if (scrollContainer) {
        scrollContainer.removeEventListener("scroll", handleScroll);
      }
    };
  }, [handleScroll]);

  if (error) {
    return (
      <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" minHeight="400px" gap={2}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Button variant="contained" color="primary" onClick={retryFetch}>
          Retry
        </Button>
      </Box>
    );
  }

  if (firstLoad && isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
        <Typography variant="body1" sx={{ ml: 2 }}>
          Loading Logs...
        </Typography>
      </Box>
    );
  }

  

  // Filter logs based on active filters and search keyword
  const filteredLogs = combinedLogs.filter(log => {
    // Check if log matches all active filters
    const matchesFilters = filters.every(filter => log[filter.type] === filter.value);

    return matchesFilters;
  });

  return (
    <Box ref={scrollContainerRef} sx={{ maxHeight: "800px", overflowY: "auto", display: "flex", flexDirection: "column", gap: 2, position: "relative" }}>
      <TextField
        variant="outlined"
        placeholder="Search logs..."
        value={searchKeyword}
        onChange={(e) => setSearchKeyword(e.target.value)}
        sx={{ mb: 2 }}
      />
      <FilterManager filters={filters} setFilters={setFilters} combinedLogs={combinedLogs} /> {/* Use FilterManager component */}
      {filteredLogs.map((log, index) => {
        const logEntryString = `${log.log_string}`;
        const formattedDate = formatDate(log.date_time || log.timestamp);
        return (
          <Box key={index} display="flex" alignItems="center" borderRadius="4px" p={1} width="100%" position="relative"
               sx={{ '&:hover .copy-icon': { display: 'block', }}}>
            <Box flex="1" display="flex" flexDirection="row" alignItems="center" sx={{ whiteSpace: "nowrap" }}>
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
                <FiClipboard
                  onClick={() => copyToClipboard(logEntryString)}
                />
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
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Box>
  );
};

export default LoggerBox;
