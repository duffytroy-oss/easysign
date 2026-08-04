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
    canvas.getContext(
        "2d"
    );

const clearButton =
    document.getElementById(
        "clearSignatureButton"
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

const signaturePreviewCard =
    document.getElementById(
        "signaturePreviewCard"
    );

const signaturePreview =
    document.getElementById(
        "signaturePreview"
    );

let isDrawing = false;
let hasSignature = false;
let lastPoint = null;

if (!token) {
    showError(
        "This signing link does not contain a token."
    );
} else {
    loadSigningRequest();
}

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

        resizeCanvas();
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

function resizeCanvas() {
    const rectangle =
        canvas.getBoundingClientRect();

    const pixelRatio =
        window.devicePixelRatio || 1;

    canvas.width =
        Math.round(
            rectangle.width
            * pixelRatio
        );

    canvas.height =
        Math.round(
            rectangle.height
            * pixelRatio
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

function pointFromEvent(event) {
    const rectangle =
        canvas.getBoundingClientRect();

    return {
        x:
            event.clientX
            - rectangle.left,
        y:
            event.clientY
            - rectangle.top
    };
}

function beginDrawing(event) {
    event.preventDefault();

    isDrawing = true;

    lastPoint =
        pointFromEvent(event);

    canvas.setPointerCapture(
        event.pointerId
    );
}

function continueDrawing(event) {
    if (!isDrawing) {
        return;
    }

    event.preventDefault();

    const currentPoint =
        pointFromEvent(event);

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

    lastPoint = currentPoint;

    hasSignature = true;

    updateAcceptButton();
}

function endDrawing(event) {
    if (!isDrawing) {
        return;
    }

    event.preventDefault();

    isDrawing = false;
    lastPoint = null;

    if (
        canvas.hasPointerCapture(
            event.pointerId
        )
    ) {
        canvas.releasePointerCapture(
            event.pointerId
        );
    }
}

function clearSignature() {
    context.clearRect(
        0,
        0,
        canvas.width,
        canvas.height
    );

    hasSignature = false;

    signatureMessage.textContent = "";

    signaturePreviewCard.classList.add(
        "hidden"
    );

    signaturePreview.removeAttribute(
        "src"
    );

    updateAcceptButton();
}

function updateAcceptButton() {
    acceptButton.disabled =
        !hasSignature
        || !consentCheckbox.checked;
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

    const signatureDataURL =
        canvas.toDataURL(
            "image/png"
        );

    signaturePreview.src =
        signatureDataURL;

    signaturePreviewCard.classList.remove(
        "hidden"
    );

    signatureMessage.textContent =
        "Signature captured successfully.";

    signaturePreviewCard.scrollIntoView({
        behavior: "smooth",
        block: "center"
    });
}

canvas.addEventListener(
    "pointerdown",
    beginDrawing
);

canvas.addEventListener(
    "pointermove",
    continueDrawing
);

canvas.addEventListener(
    "pointerup",
    endDrawing
);

canvas.addEventListener(
    "pointercancel",
    endDrawing
);

canvas.addEventListener(
    "pointerleave",
    event => {
        if (isDrawing) {
            endDrawing(event);
        }
    }
);

clearButton.addEventListener(
    "click",
    clearSignature
);

consentCheckbox.addEventListener(
    "change",
    updateAcceptButton
);

acceptButton.addEventListener(
    "click",
    acceptSignature
);

window.addEventListener(
    "resize",
    () => {
        if (!hasSignature) {
            resizeCanvas();
        }
    }
);