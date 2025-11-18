export async function apiGet(url) {
  const token = localStorage.getItem("token");
  const res = await fetch(url, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    throw new Error(`API Error: ${res.status}`);
  }
  return res.json();
}
