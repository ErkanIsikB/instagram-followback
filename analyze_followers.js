// License: MIT

const targetProfile = "user"; // Replace with the target username

const followerData = [], followingData = [];
const ghosters = [], unnoticedFans = [];

const fetchConnections = async (id, queryHash, dataPath, storageArray) => {
  let nextPageToken = null, hasMore = true;
  while (hasMore) {
    const variables = { id, include_reel: true, fetch_mutual: true, first: 50, after: nextPageToken };
    const apiResponse = await fetch(
      `https://www.instagram.com/graphql/query/?query_hash=${queryHash}&variables=${encodeURIComponent(JSON.stringify(variables))}`
    ).then(r => r.json());
    
    const pageDetails = apiResponse.data?.user?.[dataPath]?.page_info;
    if (!pageDetails) throw new Error("API response malformed");
    
    storageArray.push(...apiResponse.data.user[dataPath].edges.map(edge => ({
      handle: edge.node.username,
      name: edge.node.full_name
    })));
    
    hasMore = pageDetails.has_next_page;
    nextPageToken = pageDetails.end_cursor;
  }
};

(async function analyzeFollows() {
  try {
    console.log("Initializing analysis...");
    const userSearch = await fetch(`https://www.instagram.com/web/search/topsearch/?query=${targetProfile}`);
    const userResult = await userSearch.json();
    const profileId = userResult.users?.map(u => u.user).find(p => p.username === targetProfile)?.pk;
    if (!profileId) throw new Error("Profile unavailable");

    // Fetch followers
    await fetchConnections(profileId, "c76146de99bb02f6415203be841dd25a", "edge_followed_by", followerData);
    console.log("Follower dataset:", followerData);

    // Fetch following
    await fetchConnections(profileId, "d04b0a864b4b54837c0d870b0e77e076", "edge_follow", followingData);
    console.log("Following dataset:", followingData);

    // Cross-reference data
    ghosters.push(...followingData.filter(f => 
      !followerData.some(fd => fd.handle === f.handle)
    ));
    unnoticedFans.push(...followerData.filter(fd => 
      !followingData.some(f => f.handle === fd.handle)
    ));

    console.log("Accounts not following back the user:", ghosters);
    console.log("Accounts user don't follow back:", unnoticedFans);
    console.log("Analysis complete. Use 'copy(ghosters)' or 'copy(unnoticedFans)' to export results.");
  } catch (e) {
    console.error("Runtime anomaly:", e);
  }
})();
