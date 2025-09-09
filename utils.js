function getVideoUrl(imdbID, type = "movie") {
  const movieBase = atob("aHR0cHM6Ly92aWRyb2NrLm5ldC9tb3ZpZS8=");
  const seriesBase = atob("aHR0cHM6Ly92aWRyb2NrLm5ldC9zZXJpZXMv");
  const base = type === "series" ? seriesBase : movieBase;
  return base + imdbID;
}
