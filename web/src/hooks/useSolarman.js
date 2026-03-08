import { useState, useEffect } from 'react';
import { solarman } from '../lib/api';

const CACHE_KEY = 'solarman_data_cache';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export function useSolarmanData() {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [data, setData] = useState({
        stations: [],
        global: {
            currentPowerMW: 0,
            installedCapacityMWp: 0,
            productionPercent: 0,
        }
    });

    const fetchData = async () => {
        try {
            setLoading(true);
            setError(null);

            // 1. Ensure Token
            await solarman.getToken();

            // 2. Get Stations
            const stationsRes = await solarman.getStations();
            const stationList = stationsRes.stationList || [];

            // 3. Aggregate Data (only basic metrics)
            let currentPowerW = 0;
            let installedCapacitykW = 0;

            const processedStations = stationList.map(s => {
                // Sanitize generationPower: if offline, set to 0
                const isOffline = s.networkStatus === 'ALL_OFFLINE' || s.networkStatus === 'NO_DEVICE';
                const cleanPower = isOffline ? 0 : (s.generationPower || 0);

                currentPowerW += cleanPower;
                installedCapacitykW += (s.installedCapacity || 0);

                return {
                    ...s,
                    generationPower: cleanPower
                };
            });

            // Conversions
            const currentPowerMW = currentPowerW / 1_000_000;
            const installedCapacityMWp = installedCapacitykW / 1_000;
            // Correct formula: (current kW / installed kW) * 100
            const productionPercent = installedCapacitykW > 0 ? ((currentPowerW / 1_000) / installedCapacitykW) * 100 : 0;

            const newData = {
                stations: processedStations,
                global: {
                    currentPowerMW,
                    installedCapacityMWp,
                    productionPercent
                }
            };

            // Save to cache
            try {
                localStorage.setItem(CACHE_KEY, JSON.stringify({
                    data: newData,
                    timestamp: Date.now()
                }));
            } catch (e) {
                console.warn('Failed to save to cache:', e);
            }

            setData(newData);
            setLoading(false);

        } catch (err) {
            console.error(err);
            setError(err);
            setLoading(false);
        }
    };

    useEffect(() => {
        // Load from cache first
        try {
            const cached = localStorage.getItem(CACHE_KEY);
            if (cached) {
                const { data: cachedData, timestamp } = JSON.parse(cached);
                const age = Date.now() - timestamp;

                // Always show cached data immediately
                setData(cachedData);

                // If cache is fresh, don't show loading
                if (age < CACHE_DURATION) {
                    setLoading(false);
                }
            }
        } catch (e) {
            console.warn('Failed to load from cache:', e);
        }

        // Fetch fresh data
        fetchData();
    }, []);

    return { data, loading, error, refetch: fetchData };
}
