import * as pdfjsLib
    from "https://cdn.jsdelivr.net/npm/pdfjs-dist@5.7.284/build/pdf.mjs";

pdfjsLib.GlobalWorkerOptions.workerSrc =
    "https://cdn.jsdelivr.net/npm/pdfjs-dist@5.7.284/build/pdf.worker.mjs";


const params =
    new URLSearchParams(
        window.location.search
    );

const token =
    params.get(
        "token"
    );


// MARK: - Main Elements

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


// MARK: - PDF Elements

const leasePDFViewer =
    document.getElementById(
        "leasePDFViewer"
    );

const pdfLoading =
    document.getElementById(
        "pdfLoading"
    );

const pdfError =
    document.getElementById(
        "pdfError"
    );

const pdfErrorMessage =
    document.getElementById(
        "pdfErrorMessage"
    );

const pdfToolbar =
    document.getElementById(
        "pdfToolbar"
    );

const pdfPageCount =
    document.getElementById(
        "pdfPageCount"
    );


// MARK: - Signature Elements

const canvas =
    document.getElementById(
        "signatureCanvas"
    );

const context =
    canvas.getContext(
        "2d"
    );

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


// MARK: - Completion Elements

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


// MARK: - State

let isDrawing =
    false;

let hasSignature =
    false;

let signatureAccepted =
    false;

let lastPoint =
    null;

let acceptedSignatureDataURL =
    null;

let signerRole =
    "tenant";

let currentPDFURL =
    null;

let loadedPDFDocument =
    null;

let pdfRenderGeneration =
    0;

let pdfResizeTimer =
    null;


// MARK: - Start

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
            + encodeURIComponent(
                token
            );

        const response =
            await fetch(
                endpoint
            );

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

        signerRole =
            data.signer_role
            || "tenant";

        const signerName =
            data.signer_name
            || data.tenant_name
            || (
                signerRole === "landlord"
                    ? "Landlord"
                    : "Signer"
            );

        tenantNameElement.textContent =
            `${signerName}, please review and sign.`;

        requestStatusElement.textContent =
            formatStatus(
                data.status
            );

        loadingCard.classList.add(
            "hidden"
        );

        signingContent.classList.remove(
            "hidden"
        );

        requestAnimationFrame(
            resizeCanvas
        );

        if (!data.pdf_url) {

            showPDFError(
                "The lease PDF is not available."
            );

            return;
        }

        currentPDFURL =
            data.pdf_url;

        await loadCompletePDF(
            currentPDFURL
        );

    } catch (error) {

        console.error(
            error
        );

        showError(
            error.message
            || "Unable to load the document."
        );
    }
}


// MARK: - Main Error

function showError(
    message
) {

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


// MARK: - Format Status

function formatStatus(
    status
) {

    if (!status) {

        return "Pending";
    }

    return status
        .replaceAll(
            "_",
            " "
        )
        .replace(
            /\b\w/g,
            character =>
                character.toUpperCase()
        );
}


// MARK: - PDF Loading

async function loadCompletePDF(
    pdfURL
) {

    pdfLoading.classList.remove(
        "hidden"
    );

    pdfError.classList.add(
        "hidden"
    );

    pdfToolbar.classList.add(
        "hidden"
    );

    leasePDFViewer.replaceChildren();

    try {

        const loadingTask =
            pdfjsLib.getDocument({
                url:
                    pdfURL
            });

        loadedPDFDocument =
            await loadingTask.promise;

        pdfPageCount.textContent =
            loadedPDFDocument.numPages === 1
                ? "1 page"
                : `${loadedPDFDocument.numPages} pages`;

        pdfToolbar.classList.remove(
            "hidden"
        );

        await renderAllPDFPages();

        pdfLoading.classList.add(
            "hidden"
        );

    } catch (error) {

        console.error(
            "PDF loading error:",
            error
        );

        showPDFError(
            "The complete lease could not be displayed. Please reload the page and try again."
        );
    }
}


// MARK: - Render All PDF Pages

async function renderAllPDFPages() {

    if (!loadedPDFDocument) {

        return;
    }

    const generation =
        ++pdfRenderGeneration;

    leasePDFViewer.replaceChildren();

    const availableWidth =
        Math.max(
            280,
            leasePDFViewer.clientWidth
        );

    for (
        let pageNumber = 1;
        pageNumber <= loadedPDFDocument.numPages;
        pageNumber += 1
    ) {

        if (
            generation
            !== pdfRenderGeneration
        ) {

            return;
        }

        const page =
            await loadedPDFDocument.getPage(
                pageNumber
            );

        const baseViewport =
            page.getViewport({
                scale:
                    1
            });

        const cssScale =
            availableWidth
            / baseViewport.width;

        const cssViewport =
            page.getViewport({
                scale:
                    cssScale
            });

        const pixelRatio =
            Math.min(
                window.devicePixelRatio
                || 1,
                2
            );

        const renderViewport =
            page.getViewport({
                scale:
                    cssScale
                    * pixelRatio
            });


        // Page Wrapper

        const pageWrapper =
            document.createElement(
                "div"
            );

        pageWrapper.className =
            "pdf-page-wrapper";


        // Page Number

        const pageHeader =
            document.createElement(
                "div"
            );

        pageHeader.className =
            "pdf-page-header";

        pageHeader.textContent =
            `Page ${pageNumber} of ${loadedPDFDocument.numPages}`;


        // Canvas

        const pageCanvas =
            document.createElement(
                "canvas"
            );

        pageCanvas.className =
            "pdf-page-canvas";

        pageCanvas.width =
            Math.ceil(
                renderViewport.width
            );

        pageCanvas.height =
            Math.ceil(
                renderViewport.height
            );

        pageCanvas.style.width =
            `${Math.ceil(cssViewport.width)}px`;

        pageCanvas.style.height =
            `${Math.ceil(cssViewport.height)}px`;

        const pageContext =
            pageCanvas.getContext(
                "2d",
                {
                    alpha:
                        false
                }
            );

        pageWrapper.appendChild(
            pageHeader
        );

        pageWrapper.appendChild(
            pageCanvas
        );

        leasePDFViewer.appendChild(
            pageWrapper
        );


        // Render

        await page.render({
            canvasContext:
                pageContext,

            viewport:
                renderViewport
        }).promise;
    }
}


// MARK: - PDF Error

function showPDFError(
    message
) {

    pdfLoading.classList.add(
        "hidden"
    );

    pdfToolbar.classList.add(
        "hidden"
    );

    leasePDFViewer.replaceChildren();

    pdfErrorMessage.textContent =
        message;

    pdfError.classList.remove(
        "hidden"
    );
}


// MARK: - Canvas Setup

function resizeCanvas() {

    const rectangle =
        canvas.getBoundingClientRect();

    const pixelRatio =
        window.devicePixelRatio
        || 1;

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


// MARK: - Drawing Context

function configureDrawingContext() {

    context.lineWidth =
        2.4;

    context.lineCap =
        "round";

    context.lineJoin =
        "round";

    context.strokeStyle =
        "#111111";
}


// MARK: - Pointer Location

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


// MARK: - Draw

function drawToPoint(
    currentPoint
) {

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

    hasSignature =
        true;

    updateAcceptButton();
}


// MARK: - Finish Drawing

function finishDrawing() {

    isDrawing =
        false;

    lastPoint =
        null;
}


// MARK: - Pointer Events

function beginPointerDrawing(
    event
) {

    if (signatureAccepted) {

        return;
    }

    event.preventDefault();

    isDrawing =
        true;

    lastPoint =
        pointFromClientCoordinates(
            event.clientX,
            event.clientY
        );

    if (
        canvas.setPointerCapture
    ) {

        canvas.setPointerCapture(
            event.pointerId
        );
    }
}


function continuePointerDrawing(
    event
) {

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


function endPointerDrawing(
    event
) {

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

function beginTouchDrawing(
    event
) {

    if (signatureAccepted) {

        return;
    }

    event.preventDefault();

    const touch =
        event.touches[0];

    if (!touch) {

        return;
    }

    isDrawing =
        true;

    lastPoint =
        pointFromClientCoordinates(
            touch.clientX,
            touch.clientY
        );
}


function continueTouchDrawing(
    event
) {

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


function endTouchDrawing(
    event
) {

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

    hasSignature =
        false;

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


// MARK: - Crop Signature

function croppedSignatureDataURL() {

    const pixelRatio =
        window.devicePixelRatio
        || 1;

    const imageData =
        context.getImageData(
            0,
            0,
            canvas.width,
            canvas.height
        );

    const data =
        imageData.data;

    let minX =
        canvas.width;

    let minY =
        canvas.height;

    let maxX =
        -1;

    let maxY =
        -1;

    for (
        let y = 0;
        y < canvas.height;
        y += 1
    ) {

        for (
            let x = 0;
            x < canvas.width;
            x += 1
        ) {

            const index =
                (
                    y
                    * canvas.width
                    + x
                )
                * 4;

            const alpha =
                data[
                    index + 3
                ];

            if (
                alpha > 10
            ) {

                minX =
                    Math.min(
                        minX,
                        x
                    );

                minY =
                    Math.min(
                        minY,
                        y
                    );

                maxX =
                    Math.max(
                        maxX,
                        x
                    );

                maxY =
                    Math.max(
                        maxY,
                        y
                    );
            }
        }
    }

    if (
        maxX < minX
        || maxY < minY
    ) {

        return canvas.toDataURL(
            "image/png"
        );
    }

    const padding =
        Math.round(
            12
            * pixelRatio
        );

    minX =
        Math.max(
            0,
            minX - padding
        );

    minY =
        Math.max(
            0,
            minY - padding
        );

    maxX =
        Math.min(
            canvas.width - 1,
            maxX + padding
        );

    maxY =
        Math.min(
            canvas.height - 1,
            maxY + padding
        );

    const cropWidth =
        maxX - minX + 1;

    const cropHeight =
        maxY - minY + 1;

    const croppedCanvas =
        document.createElement(
            "canvas"
        );

    croppedCanvas.width =
        cropWidth;

    croppedCanvas.height =
        cropHeight;

    const croppedContext =
        croppedCanvas.getContext(
            "2d"
        );

    croppedContext.drawImage(
        canvas,
        minX,
        minY,
        cropWidth,
        cropHeight,
        0,
        0,
        cropWidth,
        cropHeight
    );

    return croppedCanvas
        .toDataURL(
            "image/png"
        );
}


// MARK: - Accept Signature

function acceptSignature() {

    if (!hasSignature) {

        signatureMessage.textContent =
            "Draw your signature before continuing.";

        return;
    }

    if (
        !consentCheckbox.checked
    ) {

        signatureMessage.textContent =
            "Confirm your consent before continuing.";

        return;
    }

    acceptedSignatureDataURL =
        croppedSignatureDataURL();

    signatureAccepted =
        true;

    isDrawing =
        false;

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

    consentCheckbox.disabled =
        true;

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
        behavior:
            "smooth",

        block:
            "center"
    });
}


// MARK: - Replace Signature

function replaceSignature() {

    signatureAccepted =
        false;

    acceptedSignatureDataURL =
        null;

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

    consentCheckbox.disabled =
        false;

    consentCheckbox.checked =
        false;

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

    hasSignature =
        false;

    updateAcceptButton();
}


// MARK: - Signing Date

function formattedSigningDate() {

    return new Intl.DateTimeFormat(
        undefined,
        {

            year:
                "numeric",

            month:
                "long",

            day:
                "numeric",

            hour:
                "numeric",

            minute:
                "2-digit"

        }
    ).format(
        new Date()
    );
}


// MARK: - Endpoint Selection

function completionEndpoint() {

    if (
        signerRole === "landlord"
    ) {

        return "https://ltatudiuhozwbufqybxd.supabase.co/functions/v1/complete-landlord-signing";
    }

    return "https://ltatudiuhozwbufqybxd.supabase.co/functions/v1/complete-signing";
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

    completeSigningButton.disabled =
        true;

    completeSigningButton.textContent =
        signerRole === "landlord"
            ? "Completing Lease…"
            : "Completing…";

    completionMessage.textContent =
        "";

    try {

        const endpoint =
            completionEndpoint();

        const response =
            await fetch(
                endpoint,
                {

                    method:
                        "POST",

                    headers: {

                        "Content-Type":
                            "application/json"

                    },

                    body:
                        JSON.stringify({

                            token:
                                token,

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
            signerRole === "landlord"
                ? "Completed"
                : "Signed";

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

        const smallNote =
            testCompletionCard.querySelector(
                ".small-note"
            );

        if (
            completionHeading
        ) {

            completionHeading.textContent =
                signerRole === "landlord"
                    ? "Lease fully signed"
                    : "Document signed";
        }

        if (
            completionText
        ) {

            if (
                signerRole === "landlord"
            ) {

                completionText.textContent =
                    "The landlord signature was saved and the lease is now fully signed.";

            } else if (
                data.all_tenants_signed
            ) {

                completionText.textContent =
                    "Your signature was saved. All tenants have now signed and the lease is ready for the landlord.";

            } else if (
                typeof data.remaining_tenants
                    === "number"
                && data.remaining_tenants > 0
            ) {

                completionText.textContent =
                    data.remaining_tenants === 1
                        ? "Your signature was saved. Waiting for 1 other tenant to sign."
                        : `Your signature was saved. Waiting for ${data.remaining_tenants} other tenants to sign.`;

            } else {

                completionText.textContent =
                    "Your signature was saved successfully.";
            }
        }

        if (
            smallNote
        ) {

            if (
                signerRole === "landlord"
            ) {

                smallNote.textContent =
                    "The fully executed lease has been saved securely.";

            } else if (
                data.all_tenants_signed
            ) {

                smallNote.textContent =
                    "The tenant-signed lease is now ready for landlord signing.";

            } else {

                smallNote.textContent =
                    "No further action is required from you.";
            }
        }

        testCompletionCard.scrollIntoView({

            behavior:
                "smooth",

            block:
                "center"

        });

    } catch (error) {

        console.error(
            error
        );

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
        passive:
            false
    }
);

canvas.addEventListener(
    "touchmove",
    continueTouchDrawing,
    {
        passive:
            false
    }
);

canvas.addEventListener(
    "touchend",
    endTouchDrawing,
    {
        passive:
            false
    }
);

canvas.addEventListener(
    "touchcancel",
    endTouchDrawing,
    {
        passive:
            false
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


// MARK: - Window Resize

window.addEventListener(
    "resize",
    () => {

        if (
            !hasSignature
            && !signatureAccepted
        ) {

            resizeCanvas();
        }

        if (
            loadedPDFDocument
        ) {

            clearTimeout(
                pdfResizeTimer
            );

            pdfResizeTimer =
                setTimeout(
                    () => {

                        renderAllPDFPages()
                            .catch(
                                error => {

                                    console.error(
                                        "PDF resize render error:",
                                        error
                                    );

                                }
                            );

                    },
                    250
                );
        }
    }
);