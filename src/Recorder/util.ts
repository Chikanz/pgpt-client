export function calculateSegmentDuration(maxSizeMB: number = 18, bitrateKbps: number = 128): number {
    const bytesPerSecond = (bitrateKbps * 1000) / 8; // Convert kbps to bytes per second
    const maxSizeBytes = maxSizeMB * 1024 * 1024; // Convert MB to bytes
    return Math.floor(maxSizeBytes / bytesPerSecond); // Calculate segment duration in seconds
}