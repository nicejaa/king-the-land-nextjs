"use client";

import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { buildQueryString } from "lib/utils";

/**
 * Generic hook for data table with pagination, search, and filters
 * @param {string} endpoint - API endpoint
 * @param {Record<string, any>} [params] - Extra query params
 * @param {number} [pageSize] - Page size
 */
export function useDataTable(endpoint, params = {}, pageSize = 20) {
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = buildQueryString({ page, limit: pageSize, ...params });
      const { data: res } = await axios.get(`${endpoint}?${qs}`);
      if (res.success) {
        setData(res.data);
        setTotal(res.pagination?.total ?? res.data.length);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [endpoint, page, pageSize, JSON.stringify(params)]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    setPage(1);
  }, [JSON.stringify(params)]);

  return { data, total, page, setPage, loading, error, refresh: fetchData };
}
