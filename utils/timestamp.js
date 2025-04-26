function parseDate(val) {
    return (val < 10) ? "0" + val : val;
}

// Define the function
const getTimestamp = () => {
    const dateString  = new Date().toLocaleString("en-us", { timeZone: "Africa/Nairobi" });
    const dateObject = new Date(dateString);
    const month  = parseDate(dateObject.getMonth() + 1);
    const day  = parseDate(dateObject.getDate());
    const hour = parseDate(dateObject.getHours());
    const minute = parseDate(dateObject.getMinutes());
    const second = parseDate(dateObject.getSeconds());
    return dateObject.getFullYear() + "" + month + "" + day + "" +
        hour + "" + minute + "" + second;
};

// Export the function using CommonJS syntax
module.exports = {
    getTimestamp
};
