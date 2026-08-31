async function run() {
  const url = "https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQE7_x-RFwVxRP2JG7EY5VGbZqPKnJo2H6h5Iov16k0n2zvXhL2AL02Tx9lZC1wC_AzBz2vge8w2hFQEXNw-lxHCScGfrHGG36_1Lq2ADD8iTqy9-M4jQlD7x3SSvJhcpSb-oMND0_dPhHfI759k_NSCHvLMGGQ9zBHdfGnYgCQMj0oZZGmn1BdQEY3bWMs91T1UDb0==";
  try {
    const res = await fetch(url, {
      method: 'HEAD',
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36',
      }
    });
    console.log("HEAD status:", res.status);
    console.log("HEAD URL:", res.url);
  } catch (err) {
    console.error("HEAD error:", err);
  }

  try {
    const res2 = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36',
      }
    });
    console.log("GET status:", res2.status);
    console.log("GET URL:", res2.url);
  } catch (err) {
    console.error("GET error:", err);
  }
}
run().catch(console.error);
