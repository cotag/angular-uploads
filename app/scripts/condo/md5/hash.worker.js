
var hasher = new CondoMD5Hasher(postMessage, true);	// Accepts the callback as the parameter


// Hook-up worker input
onmessage = function (e) {
	hasher.hash(e.data);
};
