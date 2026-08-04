const params =
    new URLSearchParams(
        window.location.search
    );

const token = params.get("token");

const loadingCard =
    document.getElementById(
        "loadingCard"
    );

const errorCard =
    document.getElementById(
        "errorCard"
    );

const errorMessage =
    document.getElementById(
        "errorMessage"
    );

const signingContent =
    document.getElementById(
        "signingContent"
    );

const tenantNameElement =
    document.getElementById(
        "tenantName"
    );

const requestStatusElement =
    document.getElementById(
        "requestStatus"
    );

const leasePDF =
    document.getElementById(
        "leasePDF"
    );

const canvas =
    document.getElementById(
        "signatureCanvas"
    );

const context =
    canvas.getContext("2d");

const signatureWrapper =
    document.getElementById(
        "signatureWrapper"
    );

const signatureLockedOverlay =
    document.getElementById(
        "signatureLockedOverlay"
    );

const clearButton =
    document.getElementById(
        "clearSignatureButton"
    );

const replaceButton =
    document.getElementById(
        "replaceSignatureButton"
    );

const consentRow =
    document.getElementById(
        "consentRow"
    );

const consentCheckbox =
    document.getElementById(
        "consentCheckbox"
    );

const acceptButton =
    document.getElementById(
        "acceptSignatureButton"
    );

const signatureMessage =
    document.getElementById(
        "signatureMessage"
    );

const finalReviewCard =
    document.getElementById(
        "finalReviewCard"
    );

const signedDateText =
    document.getElementById(
        "signedDateText"
    );

const completeSigningButton =
    document.getElementById(
        "completeSigningButton"
    );

const completionMessage =
    document.getElementById(
        "completionMessage"
    );

const testCompletionCard =
    document.getElementById(
        "testCompletionCard"
    );

let isDrawing = false;
let hasSignature = false;
let signatureAccepted = false;
let lastPoint = null;
let acceptedSignatureDataURL = null;

if (!token) {
    showError(
        "This signing link does not contain a token."
    );
} else {
    loadSigningRequest();
}

// MARK: - Load Signing Request

async function loadSigningRequest() {
    try {
        const endpoint =
            "https://ltatudiuhozwbufqybxd.supabase.co/functions/v1/sign-document-api?token="
            + encodeURIComponent(token);

        const response =
            await fetch(endpoint);

        const data =
            await response.json();

        if (
            !response.ok
            || !data.success
        ) {
            throw new Error(
                data.message
                || "Unable to load the document."
            );
        }

        tenantNameElement.textContent =
            `${data.tenant_name}, please review and sign.`;

        requestStatusElement.textContent =
            formatStatus(
                data.status
            );

        leasePDF.src =
            data.pdf_url;

        loadingCard.classList.add(
            "hidden"
        );

        signingContent.classList.remove(
            "hidden"
        );

        requestAnimationFrame(
            resizeCanvas
        );
    } catch (error) {
        console.error(error);

        showError(
            error.message
            || "Unable to load the document."
        );
    }
}

function showError(message) {
    loadingCard.classList.add(
        "hidden"
    );

    signingContent.classList.add(
        "hidden"
    );

    errorMessage.textContent =
        message;

    errorCard.classList.remove(
        "hidden"
    );
}

function formatStatus(status) {
    if (!status) {
        return "Pending";
    }

    return status
        .charAt(0)
        .toUpperCase()
        + status.slice(1);
}

// MARK: - Canvas Setup

function resizeCanvas() {
    const rectangle =
        canvas.getBoundingClientRect();

    const pixelRatio =
        window.devicePixelRatio || 1;

    canvas.width =
        Math.max(
            1,
            Math.round(
                rectangle.width
                * pixelRatio
            )
        );

    canvas.height =
        Math.max(
            1,
            Math.round(
                rectangle.height
                * pixelRatio
            )
        );

    context.setTransform(
        pixelRatio,
        0,
        0,
        pixelRatio,
        0,
        0
    );

    configureDrawingContext();
}

function configureDrawingContext() {
    context.lineWidth = 2.4;
    context.lineCap = "round";
    context.lineJoin = "round";
    context.strokeStyle = "#111111";
}

function pointFromClientCoordinates(
    clientX,
    clientY
) {
    const rectangle =
        canvas.getBoundingClientRect();

    return {
        x:
            clientX
            - rectangle.left,
        y:
            clientY
            - rectangle.top
    };
}

function drawToPoint(currentPoint) {
    if (
        !isDrawing
        || !lastPoint
        || signatureAccepted
    ) {
        return;
    }

    context.beginPath();

    context.moveTo(
        lastPoint.x,
        lastPoint.y
    );

    context.lineTo(
        currentPoint.x,
        currentPoint.y
    );

    context.stroke();

    lastPoint =
        currentPoint;

    hasSignature = true;

    updateAcceptButton();
}

function finishDrawing() {
    isDrawing = false;
    lastPoint = null;
}

// MARK: - Pointer Events

function beginPointerDrawing(event) {
    if (signatureAccepted) {
        return;
    }

    event.preventDefault();

    isDrawing = true;

    lastPoint =
        pointFromClientCoordinates(
            event.clientX,
            event.clientY
        );

    if (canvas.setPointerCapture) {
        canvas.setPointerCapture(
            event.pointerId
        );
    }
}

function continuePointerDrawing(event) {
    if (
        !isDrawing
        || signatureAccepted
    ) {
        return;
    }

    event.preventDefault();

    drawToPoint(
        pointFromClientCoordinates(
            event.clientX,
            event.clientY
        )
    );
}

function endPointerDrawing(event) {
    if (!isDrawing) {
        return;
    }

    event.preventDefault();

    if (
        canvas.hasPointerCapture
        && canvas.hasPointerCapture(
            event.pointerId
        )
    ) {
        canvas.releasePointerCapture(
            event.pointerId
        );
    }

    finishDrawing();
}

// MARK: - iPhone Touch Events

function beginTouchDrawing(event) {
    if (signatureAccepted) {
        return;
    }

    event.preventDefault();

    const touch =
        event.touches[0];

    if (!touch) {
        return;
    }

    isDrawing = true;

    lastPoint =
        pointFromClientCoordinates(
            touch.clientX,
            touch.clientY
        );
}

function continueTouchDrawing(event) {
    if (
        !isDrawing
        || signatureAccepted
    ) {
        return;
    }

    event.preventDefault();

    const touch =
        event.touches[0];

    if (!touch) {
        return;
    }

    drawToPoint(
        pointFromClientCoordinates(
            touch.clientX,
            touch.clientY
        )
    );
}

function endTouchDrawing(event) {
    event.preventDefault();

    finishDrawing();
}

// MARK: - Signature Actions

function clearCanvas() {
    const rectangle =
        canvas.getBoundingClientRect();

    context.clearRect(
        0,
        0,
        rectangle.width,
        rectangle.height
    );
}

function clearSignature() {
    if (signatureAccepted) {
        return;
    }

    clearCanvas();

    hasSignature = false;

    signatureMessage.textContent =
        "";

    updateAcceptButton();
}

function updateAcceptButton() {
    acceptButton.disabled =
        !hasSignature
        || !consentCheckbox.checked
        || signatureAccepted;
}

function acceptSignature() {
    if (!hasSignature) {
        signatureMessage.textContent =
            "Draw your signature before continuing.";

        return;
    }

    if (!consentCheckbox.checked) {
        signatureMessage.textContent =
            "Confirm your consent before continuing.";

        return;
    }

    acceptedSignatureDataURL =
        canvas.toDataURL(
            "image/png"
        );

    signatureAccepted = true;
    isDrawing = false;

    canvas.classList.add(
        "canvas-locked"
    );

    signatureWrapper.classList.add(
        "signature-wrapper-accepted"
    );

    signatureLockedOverlay.classList.remove(
        "hidden"
    );

    clearButton.classList.add(
        "hidden"
    );

    replaceButton.classList.remove(
        "hidden"
    );

    consentRow.classList.add(
        "consent-locked"
    );

    consentCheckbox.disabled = true;

    acceptButton.classList.add(
        "hidden"
    );

    signatureMessage.textContent =
        "";

    requestStatusElement.textContent =
        "Signature Accepted";

    requestStatusElement.classList.add(
        "status-badge-success"
    );

    signedDateText.textContent =
        `Signing date: ${formattedSigningDate()}`;

    finalReviewCard.classList.remove(
        "hidden"
    );

    finalReviewCard.scrollIntoView({
        behavior: "smooth",
        block: "center"
    });
}

function replaceSignature() {
    signatureAccepted = false;
    acceptedSignatureDataURL = null;

    canvas.classList.remove(
        "canvas-locked"
    );

    signatureWrapper.classList.remove(
        "signature-wrapper-accepted"
    );

    signatureLockedOverlay.classList.add(
        "hidden"
    );

    clearButton.classList.remove(
        "hidden"
    );

    replaceButton.classList.add(
        "hidden"
    );

    consentRow.classList.remove(
        "consent-locked"
    );

    consentCheckbox.disabled = false;
    consentCheckbox.checked = false;

    acceptButton.classList.remove(
        "hidden"
    );

    finalReviewCard.classList.add(
        "hidden"
    );

    testCompletionCard.classList.add(
        "hidden"
    );

    requestStatusElement.textContent =
        "Pending";

    requestStatusElement.classList.remove(
        "status-badge-success"
    );

    clearCanvas();

    hasSignature = false;

    updateAcceptButton();
}

function formattedSigningDate() {
    return new Intl.DateTimeFormat(
        undefined,
        {
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit"
        }
    ).format(
        new Date()
    );
}

// MARK: - Complete Signing

async function completeSigning() {
    if (
        !signatureAccepted
        || !acceptedSignatureDataURL
    ) {
        completionMessage.textContent =
            "Accept your signature before completing the document.";

        return;
    }

    completeSigningButton.disabled = true;

    completeSigningButton.textContent =
        "Completing…";

    completionMessage.textContent =
        "";

    try {
        const endpoint =
            "https://ltatudiuhozwbufqybxd.supabase.co/functions/v1/complete-signing";

        const response =
            await fetch(
                endpoint,
                {
                    method: "POST",
                    headers: {
                        "Content-Type":
                            "application/json"
                    },
                    body: JSON.stringify({
                        token: token,
                        signature_data_url:
                            acceptedSignatureDataURL
                    })
                }
            );

        const data =
            await response.json();

        if (
            !response.ok
            || !data.success
        ) {
            throw new Error(
                data.message
                || "Unable to complete signing."
            );
        }

        finalReviewCard.classList.add(
            "hidden"
        );

        testCompletionCard.classList.remove(
            "hidden"
        );

        requestStatusElement.textContent =
            "Signed";

        requestStatusElement.classList.add(
            "status-badge-success"
        );

        const completionHeading =
            testCompletionCard.querySelector(
                "h2"
            );

        const completionText =
            testCompletionCard.querySelector(
                "p"
            );

        if (completionHeading) {
            completionHeading.textContent =
                "Document signed";
        }

        if (completionText) {
            completionText.textContent =
                "Your signature was saved successfully.";
        }

        testCompletionCard.scrollIntoView({
            behavior: "smooth",
            block: "center"
        });
    } catch (error) {
        console.error(error);

        completionMessage.textContent =
            error.message
            || "Unable to complete signing.";

        completeSigningButton.disabled =
            false;

        completeSigningButton.textContent =
            "Complete Signing";
    }
}

// MARK: - Event Listeners

canvas.addEventListener(
    "pointerdown",
    beginPointerDrawing
);

canvas.addEventListener(
    "pointermove",
    continuePointerDrawing
);

canvas.addEventListener(
    "pointerup",
    endPointerDrawing
);

canvas.addEventListener(
    "pointercancel",
    endPointerDrawing
);

canvas.addEventListener(
    "touchstart",
    beginTouchDrawing,
    {
        passive: false
    }
);

canvas.addEventListener(
    "touchmove",
    continueTouchDrawing,
    {
        passive: false
    }
);

canvas.addEventListener(
    "touchend",
    endTouchDrawing,
    {
        passive: false
    }
);

canvas.addEventListener(
    "touchcancel",
    endTouchDrawing,
    {
        passive: false
    }
);

clearButton.addEventListener(
    "click",
    clearSignature
);

replaceButton.addEventListener(
    "click",
    replaceSignature
);

consentCheckbox.addEventListener(
    "change",
    updateAcceptButton
);

acceptButton.addEventListener(
    "click",
    acceptSignature
);

completeSigningButton.addEventListener(
    "click",
    completeSigning
);

window.addEventListener(
    "resize",
    () => {
        if (
            !hasSignature
            && !signatureAccepted
        ) {
            resizeCanvas();
        }
    }
);