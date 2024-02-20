(function () {


    let accessToken, csrfToken, jobUrl, validateJobURL, runJobURL;
    //Attention!!!! modify this information, with URLs of your SAC tenant
    /*const csrfTokenUrl = 'https://planifyit.eu10.hcs.cloud.sap/api/v1/csrf';
    const clientId = 'sb-d36bd0cc-eaaf-4fa8-8897-5b069998a8d9!b13';
    const clientSecret = '7f7889df-1504-49f2-9e38-e2de480d85a2$NDPTA7KjiS3YdGl0wDjw';
    const tokenUrl = 'https://planifyit.authentication.eu10.hana.ondemand.com/oauth/token';
    const apiEndpoint = 'https://planifyit.eu10.hcs.cloud.sap/api/v1/dataimport/models/Cdlg2a1kkbj139ea3kjvk86s05k/masterFactData';
    */
    const jobSettings = {
        "Mapping": {
            "Version___ID": "Version",
            "Date___CALMONTH": "Date",
            "id___ID": "id",
            "label___ID": "label",
            "startDate___ID": "startDate",
            "endDate___ID": "endDate",
            "open___ID": "open",
            "progress": "progress"
        },
        "JobSettings": {
            "importMethod": "Update"
        }
    };


    function getAccessToken(messagesElement) {
        return fetch(tokenUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: `client_id=${encodeURIComponent(clientId)}&client_secret=${encodeURIComponent(clientSecret)}&grant_type=client_credentials`
        })
            .then(response => response.json())
            .then(data => {
                accessToken = data.access_token;
                console.log('Access token:', accessToken);
                if (messagesElement) {
                    messagesElement.textContent = '';  // Clear the messages
                    messagesElement.textContent += 'Access token: ' + accessToken + '\n';
                }
            })

            .catch(error => console.error('Error:', error));
    }

    window.getAccessToken = getAccessToken;

    function getCsrfToken(messagesElement) {
        if (!accessToken) {
            console.log('Access token is not set');
            return;
        }

        return fetch(csrfTokenUrl, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'x-csrf-token': 'fetch',
                'x-sap-sac-custom-auth': 'true'
            }
        })
            .then(response => {
                csrfToken = response.headers.get('x-csrf-token');
                console.log('CSRF token:', csrfToken);
                if (messagesElement) {
                    messagesElement.textContent = '';  // Clear the messages
                    messagesElement.textContent += 'CSRF token: ' + csrfToken + '\n';
                }

            })
            .catch(error => console.error('Error:', error));
    }

    window.getCsrfToken = getCsrfToken;

    function createJob(messagesElement) {
        if (!accessToken || !csrfToken) {
            console.log('Access token or CSRF token is not set');
            return;
        }

        return fetch(apiEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`,
                'x-csrf-token': csrfToken,
                'x-sap-sac-custom-auth': 'true'
            },
            body: JSON.stringify(jobSettings)
        })
            .then(response => {
                console.log(response);  // Log the raw response object.
                return response.json();
            })
            .then(data => {
                jobUrl = data.jobURL;
                console.log('Job URL:', jobUrl);
                if (messagesElement) {
                    messagesElement.textContent = '';  // Clear the messages
                    messagesElement.textContent += 'Job URL: ' + jobUrl + '\n';
                }

            })
            .catch(error => console.error('Error:', error));
    }
    window.createJob = createJob;
    function uploadData(csvData, messagesElement) {
        console.log('uploadData is triggered');
        if (!accessToken || !csrfToken || !jobUrl) {
            console.log('Access token, CSRF token, or job URL is not set');
            return;
        }
        // Log the values of accessToken, csrfToken, and jobUrl
        console.log('accessToken:', accessToken);
        console.log('csrfToken:', csrfToken);
        console.log('jobUrl:', jobUrl);
        console.log('csvData:', csvData);
        return fetch(jobUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'text/csv',
                'Authorization': `Bearer ${accessToken}`,
                'x-csrf-token': csrfToken,
                'x-sap-sac-custom-auth': 'true'
            },
            body: csvData
        })
            .then(response => {
                console.log(response);  // Log the raw response object.
                return response.json();
            })
            .then(data => {
                console.log(data);
                validateJobURL = data.validateJobURL;
                runJobURL = data.runJobURL;
                console.log('Validate job URL:', validateJobURL);
                console.log('Run job URL:', runJobURL);
                if (messagesElement) {
                    messagesElement.textContent = '';  // Clear the messages
                    messagesElement.textContent += 'Validate job URL: ' + validateJobURL + '\n';
                    messagesElement.textContent += 'Run job URL: ' + runJobURL + '\n';
                }

            })
            .catch(error => console.error('Error:', error));
    }
    window.uploadData = uploadData;

    function validateJob(messagesElement) {
        if (!accessToken || !csrfToken || !validateJobURL) {
            console.log('Access token, CSRF token, or validate job URL is not set');
            return;
        }

        return fetch(validateJobURL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`,
                'x-csrf-token': csrfToken,
                'x-sap-sac-custom-auth': 'true'
            }
        })
            .then(response => response.json())
            .then(data => {
                console.log('Job validation response:', data);
                if (data.failedNumberRows > 0) {
                    invalidRowsURL = data.invalidRowsURL;
                    console.log('Invalid rows URL:', invalidRowsURL);
                    if (messagesElement) {
                        messagesElement.textContent = '';  // Clear the messages
                        messagesElement.textContent += 'Invalid rows URL: ' + invalidRowsURL + '\n';
                    }

                    // Fetch the invalid rows
                    return fetch(invalidRowsURL, {
                        method: 'GET',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${accessToken}`,
                            'x-csrf-token': csrfToken,
                            'x-sap-sac-custom-auth': 'true'
                        }
                    })
                        .then(response => response.json())
                        .then(data => {
                            console.log('Invalid rows:', data);
                        })
                        .catch(error => console.error('Error:', error));
                }
            })
            .catch(error => console.error('Error:', error));
    }
    window.validateJob = validateJob;
    function runJob(messagesElement) {
        if (!accessToken || !csrfToken || !runJobURL) {
            console.log('Access token, CSRF token, or run job URL is not set');
            return;
        }

        return fetch(runJobURL, {
            method: 'POST',
            headers: {
                'Content-Type': 'text/csv',
                'Authorization': `Bearer ${accessToken}`,
                'x-csrf-token': csrfToken,
                'x-sap-sac-custom-auth': 'true'
            }
        })
            .then(response => response.json())
            .then(data => {
                console.log('Job run response:', data);
                jobStatusURL = data.jobStatusURL;
                console.log('Job status URL:', jobStatusURL);
                if (messagesElement) {
                    messagesElement.textContent = '';  // Clear the messages
                    messagesElement.textContent += 'Invalid rows URL: ' + jobStatusURL + '\n';
                }

                // Fetch the job status
                return fetch(jobStatusURL, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'x-csrf-token': csrfToken,
                        'x-sap-sac-custom-auth': 'true'
                    }
                })
                    .then(response => response.json())
                    .then(data => {
                        console.log('Job status:', data);
                    })
                    .catch(error => console.error('Error:', error));
            })
            .catch(error => console.error('Error:', error));
    }
    window.runJob = runJob;




})();