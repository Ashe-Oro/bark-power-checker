// Global flag for toggling
let detailsVisible = false;

class BarkUtils {
    // Method to sanitize the Twitter handle
    static sanitizeTwitterHandle(handle) {
        // Remove the @ symbol if it exists
        return handle.replace(/^@/, '');
    }

    // Method to sanitize general input to prevent XSS or other issues
    static sanitizeInput(input) {
        return input.replace(/[<>\/]/g, ''); // Strip harmful characters
    }

    // Method to check if the input is a valid Hedera accountId in the format 0.0.xxxx
    static isAccountId(input) {
        const accountIdRegex = /^0\.0\.\d+$/;
        return accountIdRegex.test(input);
    }

    // Method to format numbers with commas
    static formatNumber(number) {
        return number.toLocaleString('en-US'); // Formats number with commas for the US
    }
}

class BarkApi {
    constructor() {
        this.baseUrls = {
            mirrorNode: 'https://mainnet-public.mirrornode.hedera.com/api/v1/tokens/0.0.5022567',
            barkingPower: 'https://sure-angeline-piotrswierzy-b061c303.koyeb.app/barking-power',
            users: 'https://sure-angeline-piotrswierzy-b061c303.koyeb.app/users',
            leaderboard: 'https://sure-angeline-piotrswierzy-b061c303.koyeb.app/barking-power/leaderboard',
        };
    }

    async fetchBalance(accountId) {
        const url = `${this.baseUrls.mirrorNode}/balances?account.id=${accountId}`;
        const response = await fetch(url);
        return await response.json();
    }

    async fetchBarkingPower(accountId) {
        const url = `${this.baseUrls.barkingPower}/${accountId}`;
        const response = await fetch(url);
        return await response.json();
    }

    async fetchUserByAccountId(accountId) {
        const url = `${this.baseUrls.users}/${accountId}`;
        const response = await fetch(url);
        return await response.json();
    }

    async fetchUserByTwitter(twitterHandle) {
        const url = `${this.baseUrls.users}/twitter/${twitterHandle}`;
        const response = await fetch(url);
        return await response.json();
    }

    async fetchLeaderboard(limit = 1000) {
        const url = `${this.baseUrls.leaderboard}/${limit}`;
        const response = await fetch(url);
        return await response.json();
    }
}

const barkApi = new BarkApi();

async function checkBarkPower() {
    document.getElementById("output").innerHTML = "";
    document.getElementById("error").innerHTML = "";

    let userInput = BarkUtils.sanitizeInput(document.getElementById('twitterHandle').value);
    let isHederaAccount = BarkUtils.isAccountId(userInput);

    try {
        let accountLabel = '';
        let hbarkBalance = 0;
        let barkPowerData = null;
        let userData = null;

        if (isHederaAccount) {
            const accountId = userInput;

            const balanceData = await barkApi.fetchBalance(accountId);
            hbarkBalance = balanceData.balances?.[0]?.balance || 0;
            accountLabel = hbarkBalance ? "Current $HBARK holder" : "Account does not currently hold $HBARK";

            const barkingPowerData = await barkApi.fetchBarkingPower(accountId);
            if (barkingPowerData.code === "HBARK_USER_NOT_FOUND") {
                if (!hbarkBalance) {
                    accountLabel = "Account does not currently hold $HBARK and has not been allocated Bark Power";
                }
                displayBarkPowerData(null, accountLabel, null, hbarkBalance, accountId);
                return;
            }

            barkPowerData = barkingPowerData;

            userData = await barkApi.fetchUserByAccountId(accountId);
            if (userData.code === "HBARK_USER_NOT_FOUND") {
                accountLabel = "$HBARK Holder, but has not been allocated Bark Power";
            } else {
                accountLabel = userData.signedTermMessage
                    ? "Signed Terms"
                    : userData.twitterHandle
                    ? "Twitter Account Linked"
                    : "$HBARK Holder, allocated Bark Power";
            }
            displayBarkPowerData(barkPowerData, accountLabel, userData, hbarkBalance, accountId);
        } else {
            const twitterHandle = BarkUtils.sanitizeTwitterHandle(userInput);
            const userData = await barkApi.fetchUserByTwitter(twitterHandle);

            if (userData.code === "HBARK_USER_NOT_FOUND") {
                accountLabel = "Has not linked with Hedera Account";
                const leaderboardData = await barkApi.fetchLeaderboard();
                const leaderboardItem = leaderboardData.find(item => item.twitterHandle?.toLowerCase() === twitterHandle.toLowerCase());

                if (leaderboardItem) {
                    barkPowerData = { barksReceived: leaderboardItem.barksReceived };
                    displayBarkPowerData(barkPowerData, accountLabel, null);
                } else {
                    document.getElementById('error').textContent = "No barks received for this Twitter handle.";
                }
            } else {
                const accountId = userData.accountId;
                const barkingPowerData = await barkApi.fetchBarkingPower(accountId);
                barkPowerData = barkingPowerData;

                const balanceData = await barkApi.fetchBalance(accountId);
                hbarkBalance = balanceData.balances?.[0]?.balance || 0;
                accountLabel = userData.isVerified && userData.signedTermMessage ? "Fully linked account" : "Has not fully linked a Hedera Account";
                
                displayBarkPowerData(barkPowerData, accountLabel, userData, hbarkBalance, accountId);
            }
        }
    } catch (error) {
        document.getElementById('error').textContent = `An error occurred: ${error.message}. Please ensure the account ID or Twitter handle is correct and try again.`;
    }
}





function displayBarkPowerData(barkPowerData, accountLabel, userData = null, hbarkBalance = null, accountId = null) {
    console.log(`Displaying data with accountLabel: ${accountLabel}`);
    let output = `<p><strong>Account Label:</strong> ${accountLabel}</p>`;

    if (barkPowerData && (barkPowerData.todayAllocatedBarks !== undefined)) {
        console.log('Displaying barking power details.');
        // Existing logic for displaying barking power details
        const barkPowerUsed = barkPowerData.todayAllocatedBarks - barkPowerData.barkingPower;
        const barkPowerPercentageUsed = (barkPowerUsed / barkPowerData.todayAllocatedBarks) * 100;

        output += `
            <p><strong>Bark Power Refilled:</strong> ${BarkUtils.formatNumber(Math.floor(barkPowerData.todayAllocatedBarks))}</p>
            <p><strong>Barking Power Remaining:</strong> ${BarkUtils.formatNumber(Math.floor(barkPowerData.barkingPower))}</p>
            <p><strong>Bark Power Used Today:</strong> ${BarkUtils.formatNumber(Math.floor(barkPowerUsed))}</p>
            <p><strong>Total Barks Given:</strong> ${BarkUtils.formatNumber(Math.floor(barkPowerData.totalBarksDonated))}</p>
            <p><strong>Total Barks Received:</strong> ${BarkUtils.formatNumber(Math.floor(barkPowerData.barksReceived))}</p>
        `;

        // Include More Details section
        const accountIdToUse = barkPowerData.accountId || accountId;
        const hashscanUrl = `https://hashscan.io/mainnet/account/${accountIdToUse}`;
        output += `
            <hr>
            <div id="extraDetails" class="toggle-section">
                <p><strong>Account ID:</strong> <a href="${hashscanUrl}" target="_blank">${accountIdToUse}</a></p>
        `;

        // Include Twitter handle if available
        if (userData && userData.twitterHandle) {
            output += `<p><strong>Twitter Handle:</strong> @${userData.twitterHandle}</p>`;
        }

        // Include $hbark Token Balance
        output += `<p><strong>$hbark Token Balance:</strong> ${hbarkBalance !== null ? BarkUtils.formatNumber(hbarkBalance) : 'N/A'}</p>`;

        // Include hodlRelativeBarkingPower and lpRelativeBarkingPower
        output += `
                <p><strong>$hBARK Balance (HODL) at time of last refill:</strong> ${BarkUtils.formatNumber(Math.floor(barkPowerData.hodlRelativeBarkingPower / 2))}</p>
                <p><strong>$hBARK Balance (LP) at time of last refill:</strong> ${BarkUtils.formatNumber(Math.floor(barkPowerData.lpRelativeBarkingPower / 3))}</p>
            </div>
        `;

        // Display progress bar and details
        document.getElementById("output").innerHTML = output;

        const toggleDetailsElement = document.getElementById("toggleDetails");
        if (toggleDetailsElement) {
            toggleDetailsElement.style.display = "block"; // Show the toggle button
        }

        const extraDetailsElement = document.getElementById("extraDetails");
        if (extraDetailsElement) {
            extraDetailsElement.style.display = "none"; // Hide details section initially
        }

        const progressContainerElement = document.getElementById("progressContainer");
        if (progressContainerElement) {
            progressContainerElement.style.display = "block"; // Show progress bar container
        }

        updateProgressBar(barkPowerPercentageUsed);
    } else if (barkPowerData && barkPowerData.barksReceived !== undefined) {
        console.log('Displaying barks received data for unlinked user.');
        // For users who have not linked a Hedera account but have received barks
        //output += `<p>This user can receive Barks but cannot give them since they do not own $hBARK or have a linked Hedera account.</p>`;
        output += `<p><strong>Total Barks Received:</strong> ${BarkUtils.formatNumber(barkPowerData.barksReceived)}</p>`;
        document.getElementById("output").innerHTML = output;
    } else {
        console.log('Displaying basic information without barking power data.');
        // When barkPowerData is not available or missing expected properties
        // Display $hbark Token Balance if available
        if (hbarkBalance !== null) {
            output += `<p><strong>$hbark Token Balance:</strong> ${BarkUtils.formatNumber(hbarkBalance)}</p>`;
        }

        // Include Account ID if available
        if (accountId) {
            const hashscanUrl = `https://hashscan.io/mainnet/account/${accountId}`;
            output += `
                <hr>
                <div id="extraDetails" class="toggle-section">
                    <p><strong>Account ID:</strong> <a href="${hashscanUrl}" target="_blank">${accountId}</a></p>
            `;
        }

        // Include Twitter handle if available
        if (userData && userData.twitterHandle) {
            output += `<p><strong>Twitter Handle:</strong> @${userData.twitterHandle}</p>`;
        }

        if (accountId || (userData && userData.twitterHandle)) {
            output += `</div>`;

            const toggleDetailsElement = document.getElementById("toggleDetails");
            if (toggleDetailsElement) {
                toggleDetailsElement.style.display = "block"; // Show the toggle button
            }

            const extraDetailsElement = document.getElementById("extraDetails");
            if (extraDetailsElement) {
                extraDetailsElement.style.display = "none"; // Hide details section initially
            }
        }

        document.getElementById("output").innerHTML = output;
    }
}

// Function to fetch and display the "Barks Remaining" leaderboard
async function fetchBarksRemaining() {
    const url = 'https://sure-angeline-piotrswierzy-b061c303.koyeb.app/barking-power/leaderboard/barkingPower/50';
    const leaderboardTable = document.getElementById('barksRemainingLeaderboardBody');
    const leaderboard = document.getElementById('barksRemainingLeaderboard'); // Get the table element

    try {
        let response = await fetch(url);
        if (response.ok) {
            let data = await response.json();

            // Clear existing leaderboard content
            leaderboardTable.innerHTML = '';

            // Loop through the data and populate the leaderboard
            data.forEach((item) => {
                let row = document.createElement('tr');

                // Check if twitterHandle exists, if not use accountId
                let displayName = item.twitterHandle ? item.twitterHandle : item.accountId;

                // Create the Twitter User (or Account ID) cell
                let twitterUserCell = document.createElement('td');
                twitterUserCell.textContent = displayName;

                // Create the Bark Power Remaining cell (with number formatting)
                let barkPowerRemainingCell = document.createElement('td');
                barkPowerRemainingCell.textContent = item.barkingPower.toLocaleString('en-US'); // format number with commas

                // Append the cells to the row
                row.appendChild(twitterUserCell);
                row.appendChild(barkPowerRemainingCell);

                // Append the row to the table body
                leaderboardTable.appendChild(row);
            });

            // Show the leaderboard after the data is loaded
            leaderboard.style.display = 'table'; // Ensures the table is visible
        } else {
            console.error('Failed to fetch barks remaining data.');
        }
    } catch (error) {
        console.error('Error occurred while fetching barks remaining data:', error);
    }
}

// Event listener for the button click to trigger fetching barks remaining
const fetchBarksRemainingButton = document.getElementById('fetchBarksRemainingButton');
if (fetchBarksRemainingButton) {
    fetchBarksRemainingButton.addEventListener('click', fetchBarksRemaining);
}

// Function to toggle the visibility of additional details
function toggleDetails() {
    const extraDetails = document.getElementById("extraDetails");
    const toggleDetailsButton = document.getElementById("toggleDetails");

    if (extraDetails && toggleDetailsButton) {
        if (extraDetails.style.display === "none" || extraDetails.style.display === "") {
            // Show details
            extraDetails.style.display = "block";
            toggleDetailsButton.innerText = "Hide Details";
        } else {
            // Hide details
            extraDetails.style.display = "none";
            toggleDetailsButton.innerText = "Show More Details";
        }
    }
}

// Function to update the progress bar based on bark power usage
function updateProgressBar(percentageUsed) {
    const progressBar = document.getElementById("progressBar");

    // Check if the element exists before updating it
    if (!progressBar) {
        console.error("Progress bar element not found.");
        return;
    }

    // Check if percentageUsed is NaN
    if (isNaN(percentageUsed)) {
        progressBar.innerText = "No Bark Power to Use";
        progressBar.style.width = "100%";
        progressBar.style.backgroundColor = "#ff0000"; // Set to red for NaN
    } else {
        // Update progress bar with valid percentage and reset styles
        progressBar.style.width = `${percentageUsed}%`;
        progressBar.innerText = `${Math.floor(percentageUsed)}% Used`;

        // Reset the background color to default or desired color
        progressBar.style.backgroundColor = "#00cc99"; // Example color, change to your desired one
    }
}
