package art.lazying.auspice

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.util.AtomicFile
import androidx.compose.runtime.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import androidx.compose.ui.platform.LocalContext
import com.android.billingclient.api.*
import kotlinx.coroutines.*
import kotlinx.serialization.Serializable
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.*
import okhttp3.*
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.RequestBody.Companion.toRequestBody
import java.io.File
import java.util.UUID

@Serializable data class DeepReport(
    val id: String, val created: Double, val language: String, val question: String, val status: String,
    val facts: JsonObject, val report: Map<String, String>? = null, val error: String? = null,
    val settled: Boolean? = null, val checkoutSession: String? = null
)
@Serializable private data class ReportArchive(val capability: String, val reports: List<DeepReport>, val receipts: Map<String, String> = emptyMap())

object DeepReports {
    const val PRODUCT = "bazi_deep_report"
    private val json = Json { ignoreUnknownKeys = true; encodeDefaults = true }
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main.immediate)
    private val http = OkHttpClient.Builder().callTimeout(40, java.util.concurrent.TimeUnit.SECONDS).build()
    private var file: AtomicFile? = null
    private var capability = ""
    private var receipts = mapOf<String, String>()
    private var billing: BillingClient? = null
    private var connecting = false
    private var product: ProductDetails? = null
    var reports by mutableStateOf<List<DeepReport>>(emptyList()); private set
    var price by mutableStateOf<String?>(null); private set
    var available by mutableStateOf(false); private set
    var busy by mutableStateOf(false); private set
    var message by mutableStateOf<String?>(null); private set

    fun load(context: Context) {
        if (file != null) return
        val target = AtomicFile(File(context.filesDir, "bazi-reports-v1.json")); file = target
        try {
            if (target.baseFile.exists() || File(target.baseFile.path + ".bak").exists()) {
                val saved = json.decodeFromString<ReportArchive>(target.readFully().decodeToString())
                capability = saved.capability; reports = saved.reports; receipts = saved.receipts
            } else {
                capability = (UUID.randomUUID().toString() + UUID.randomUUID().toString()).replace("-", "")
                persist()
            }
        } catch (_: Exception) { capability = ""; message = "report.storageError" }
        billing = BillingClient.newBuilder(context.applicationContext)
            .setListener { result, purchases ->
                busy = false
                when (result.responseCode) {
                    BillingClient.BillingResponseCode.OK -> purchases.orEmpty().forEach { scope.launch { deliver(it) } }
                    BillingClient.BillingResponseCode.USER_CANCELED -> message = null
                    else -> message = "report.retryPurchase"
                }
            }
            .enablePendingPurchases(PendingPurchasesParams.newBuilder().enableOneTimeProducts().build())
            .enableAutoServiceReconnection().build()
    }
    private fun persist() {
        check(capability.isNotEmpty())
        val target = checkNotNull(file)
        var stream: java.io.FileOutputStream? = null
        try {
            stream = target.startWrite()
            stream.write(json.encodeToString(ReportArchive(capability, reports, receipts)).toByteArray())
            target.finishWrite(stream)
        } catch (e: Exception) { target.failWrite(stream); throw e }
    }
    private fun keep(row: DeepReport) {
        val old = reports
        reports = listOf(row) + reports.filterNot { it.id == row.id }
        try { persist() } catch (e: Exception) { reports = old; throw e }
    }
    private suspend fun request(action: String, payload: JsonObject): JsonObject {
        persist()
        val key = capability
        return withContext(Dispatchers.IO) {
            val req = Request.Builder().url("https://oracle.lazying.art/v1/reports/$action")
                .header("Authorization", "Bearer $key")
                .post(payload.toString().toRequestBody("application/json".toMediaType())).build()
            http.newCall(req).execute().use { response ->
                check(response.isSuccessful)
                json.parseToJsonElement(checkNotNull(response.body).string()).jsonObject
            }
        }
    }
    fun start() {
        val client = billing ?: return
        if (client.isReady) { query(); return }
        if (connecting) return
        connecting = true
        client.startConnection(object : BillingClientStateListener {
            override fun onBillingSetupFinished(result: BillingResult) {
                connecting = false
                if (result.responseCode == BillingClient.BillingResponseCode.OK) query()
            }
            override fun onBillingServiceDisconnected() { connecting = false; price = null }
        })
        scope.launch { recover() }
    }
    private fun query() {
        val client = billing ?: return
        client.queryProductDetailsAsync(QueryProductDetailsParams.newBuilder().setProductList(listOf(
            QueryProductDetailsParams.Product.newBuilder().setProductId(PRODUCT).setProductType(BillingClient.ProductType.INAPP).build()
        )).build()) { result, details ->
            product = if (result.responseCode == BillingClient.BillingResponseCode.OK) details.productDetailsList.firstOrNull() else null
            price = product?.oneTimePurchaseOfferDetails?.formattedPrice
        }
        client.queryPurchasesAsync(QueryPurchasesParams.newBuilder().setProductType(BillingClient.ProductType.INAPP).build()) { result, purchases ->
            if (result.responseCode == BillingClient.BillingResponseCode.OK) purchases.forEach { scope.launch { deliver(it) } }
        }
        scope.launch {
            available = runCatching {
                withContext(Dispatchers.IO) {
                    http.newCall(Request.Builder().url("https://oracle.lazying.art/v1/reports/catalog").build()).execute().use {
                        it.isSuccessful && json.parseToJsonElement(checkNotNull(it.body).string()).jsonObject["google"]?.jsonPrimitive?.boolean == true
                    }
                }
            }.getOrDefault(false)
            recover()
        }
    }
    suspend fun recover() {
        for ((id, token) in receipts.toMap()) verify(id, token)
        runCatching {
            val result = request("list", buildJsonObject {})
            result["reports"]?.jsonArray?.forEach { keep(json.decodeFromJsonElement(it)) }
        }
    }
    suspend fun purchase(activity: Activity, profile: BirthProfile, question: String): String? {
        if (busy || !available || price == null) { message = "report.unavailable"; return null }
        busy = true; message = null
        return try {
            if (receipts.isNotEmpty()) {
                recover()
                if (receipts.isNotEmpty()) { busy = false; message = "report.retryPurchase"; return null }
            }
            // Refresh product details immediately before launch; cached price
            // details can become stale while the app is backgrounded.
            val details = withTimeout(12000) {
                suspendCancellableCoroutine<ProductDetails> { continuation ->
                    checkNotNull(billing).queryProductDetailsAsync(QueryProductDetailsParams.newBuilder().setProductList(listOf(
                        QueryProductDetailsParams.Product.newBuilder().setProductId(PRODUCT).setProductType(BillingClient.ProductType.INAPP).build()
                    )).build()) { result, response ->
                        if (continuation.isActive) {
                            val current = response.productDetailsList.firstOrNull()
                            if (result.responseCode == BillingClient.BillingResponseCode.OK && current != null) continuation.resumeWith(Result.success(current))
                            else continuation.resumeWith(Result.failure(IllegalStateException("product unavailable")))
                        }
                    }
                }
            }
            product = details; price = details.oneTimePurchaseOfferDetails?.formattedPrice
            val row = json.decodeFromJsonElement<DeepReport>(request("create", buildJsonObject {
                put("id", UUID.randomUUID().toString()); put("profile", JsonObject(profile.engineInput().filterKeys { it in setOf("year", "month", "day", "hour", "minute", "gender", "longitude", "utcOffsetHours", "timeKnown") }))
                put("language", Localisation.code); put("question", question.take(1000))
            }))
            keep(row)
            val item = BillingFlowParams.ProductDetailsParams.newBuilder().setProductDetails(details)
            details.oneTimePurchaseOfferDetails?.offerToken?.let { item.setOfferToken(it) }
            val result = checkNotNull(billing).launchBillingFlow(activity, BillingFlowParams.newBuilder()
                .setProductDetailsParamsList(listOf(item.build())).setObfuscatedProfileId(row.id).build())
            if (result.responseCode != BillingClient.BillingResponseCode.OK) { busy = false; message = "report.retryPurchase" }
            row.id
        } catch (cancelled: CancellationException) { busy = false; throw cancelled }
        catch (_: Exception) { busy = false; message = "report.retryPurchase"; null }
    }
    private suspend fun deliver(purchase: Purchase) {
        if (!purchase.products.contains(PRODUCT)) return
        if (purchase.purchaseState == Purchase.PurchaseState.PENDING) { message = "report.pending"; return }
        if (purchase.purchaseState != Purchase.PurchaseState.PURCHASED) return
        val id = purchase.accountIdentifiers?.obfuscatedProfileId ?: run { message = "report.retryPurchase"; return }
        receipts = receipts + (id to purchase.purchaseToken)
        try { persist() } catch (_: Exception) { message = "report.storageError"; return }
        verify(id, purchase.purchaseToken)
    }
    private suspend fun verify(id: String, token: String) {
        try {
            val row = json.decodeFromJsonElement<DeepReport>(request("verify", buildJsonObject {
                put("id", id); put("platform", "google"); put("receipt", token)
            }))
            keep(row)
            if (row.settled == true) { receipts = receipts - id; persist() }
            message = null
        } catch (cancelled: CancellationException) { throw cancelled }
        catch (_: Exception) { message = "report.retryPurchase" }
    }
    suspend fun refresh(id: String, retry: Boolean = false) {
        try {
            keep(json.decodeFromJsonElement(request(if (retry) "retry" else "get", buildJsonObject { put("id", id) })))
            message = null
        } catch (cancelled: CancellationException) { throw cancelled }
        catch (_: Exception) { message = "report.connectionError" }
    }
}

val deepReportSections = listOf("overview", "balance", "work", "relationships", "cycles", "year", "practice")

@Composable fun DeepReportPanel(profile: BirthProfile) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var question by rememberPracticeState("bazi.report.question", "")
    var selected by remember { mutableStateOf<String?>(null) }
    Panel(title = t("report.title")) {
        Text(t("report.offer"), style = Type.serif(17), color = Palette.inkSoft)
        Text(t("report.privacy"), style = Type.sans(13), color = Palette.inkMute)
        OutlinedTextField(value = question, onValueChange = { question = it.take(1000) }, label = { Text(t("report.question")) }, modifier = Modifier.fillMaxWidth())
        PrimaryButton(if (DeepReports.busy) t("report.processing") else lf(t("report.buy"), DeepReports.price ?: "—"), enabled = !DeepReports.busy && DeepReports.available && DeepReports.price != null) {
            scope.launch { (context as? Activity)?.let { selected = DeepReports.purchase(it, profile, question) } }
        }
        if (!DeepReports.available || DeepReports.price == null) Text(t("report.unavailable"), color = Palette.inkMute)
        TextButton(onClick = { DeepReports.start(); scope.launch { DeepReports.recover() } }) { Text(t("report.recover")) }
        DeepReports.message?.let { Text(t(it), color = Palette.gold) }
        DeepReports.reports.forEach { row ->
            TextButton(onClick = { selected = row.id }) {
                Text(java.time.Instant.ofEpochSecond(row.created.toLong()).atZone(java.time.ZoneId.systemDefault()).toLocalDate().toString() + " · " + (row.question.ifEmpty { t("report.title") }) + " · " + t("report.status.${row.status}"))
            }
        }
    }
    selected?.let { id -> DeepReportDialog(id) { selected = null } }
}

@Composable private fun DeepReportDialog(id: String, close: () -> Unit) {
    val row = DeepReports.reports.find { it.id == id }
    val scope = rememberCoroutineScope()
    val context = LocalContext.current
    LaunchedEffect(id) {
        DeepReports.refresh(id)
        while (isActive) {
            val current = DeepReports.reports.find { it.id == id } ?: break
            if (current.status != "generating" && !(current.status == "paid" && current.error == null)) break
            delay(6000); DeepReports.refresh(id)
        }
    }
    Dialog(onDismissRequest = close, properties = DialogProperties(usePlatformDefaultWidth = false)) {
        Surface(color = Palette.night, contentColor = Palette.ink, modifier = Modifier.fillMaxSize()) {
            Column(Modifier.safeDrawingPadding().padding(20.dp).verticalScroll(rememberScrollState()), verticalArrangement = Arrangement.spacedBy(16.dp)) {
                TextButton(onClick = close) { Text(t("common.done")) }
                Text(t("report.title"), style = Type.display(24))
                row?.let {
                    val chart = Json { ignoreUnknownKeys = true }.decodeFromJsonElement<BaziChart>(it.facts.getValue("chart"))
                    Panel(title = t("report.original")) {
                        Text(listOf(chart.pillars.year.ganzhi, chart.pillars.month.ganzhi, chart.pillars.day.ganzhi, chart.pillars.hour.ganzhi).joinToString(" · "))
                        Text(lf(t("bazi.quickSummary"), l(chart.dayMaster.stem), l(chart.dayMaster.element), t("bazi.${chart.strength}"), chart.favourable.joinToString(" · ") { e -> l(e) }))
                        if (it.facts["timeKnown"]?.jsonPrimitive?.boolean == false) Text(t("birth.timeUnknown"))
                    }
                    it.report?.let { report ->
                        deepReportSections.forEach { section -> Panel(title = t("report.section.$section")) { Text(report[section].orEmpty(), style = Type.serif(18)) } }
                        TextButton(onClick = {
                            val text = deepReportSections.joinToString("\n\n") { section -> t("report.section.$section") + "\n" + report[section].orEmpty() }
                            context.startActivity(Intent.createChooser(Intent(Intent.ACTION_SEND).setType("text/plain").putExtra(Intent.EXTRA_TEXT, text), t("notebook.export")))
                        }) { Text(t("notebook.export")) }
                    } ?: run {
                        Text(t(if (it.error == null) "report.status.${it.status}" else "report.generationError"))
                        if (it.status == "generating") CircularProgressIndicator(color = Palette.gold)
                        PrimaryButton(t("report.retry")) { scope.launch { DeepReports.recover(); DeepReports.refresh(id, true) } }
                    }
                }
                DeepReports.message?.let { Text(t(it), color = Palette.gold) }
            }
        }
    }
}
