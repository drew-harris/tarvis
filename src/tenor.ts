type Gif = {
  id: string;
  title: string;
  media_formats: {
    gif: {
      url: string;
    };
  };
  content_description: string;
  url: string;
};
type Response = {
  results: Gif[];
};
export const searchTenorForGifs = async (query: string): Promise<string> => {
  const params = new URLSearchParams({
    q: query,
    key: process.env.TENOR_API_KEY!,
    client_key: "Discord bot",
    limit: "4",
  });

  const response = await fetch(
    `https://tenor.googleapis.com/v2/search?${params.toString()}`,
  );
  const data = (await response.json()) as Response;
  console.log(data);
  if (data.results.length === 0) {
    throw new Error("No gifs found");
  }
  const url = data.results[0]?.media_formats.gif.url;
  if (!url) {
    throw new Error("No gif url found");
  }
  return url;
};
