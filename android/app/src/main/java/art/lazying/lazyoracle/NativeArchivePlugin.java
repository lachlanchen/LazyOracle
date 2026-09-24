package art.lazying.lazyoracle;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;
import java.nio.charset.StandardCharsets;
import java.io.FileInputStream;
import java.io.ByteArrayOutputStream;

/** Read-only upgrade bridge. The native files remain intact for rollback. */
@CapacitorPlugin(name = "NativeArchive")
public class NativeArchivePlugin extends Plugin {
    @PluginMethod public void read(PluginCall call) {
        try {
            JSObject result = new JSObject();
            if (getContext().getPackageName().equals("art.lazying.auspice")) {
                android.content.SharedPreferences prefs = getContext().getSharedPreferences("auspice", 0);
                result.put("profile", prefs.getString("profile", null));
                result.put("language", prefs.getString("language", null));
                File chats = new File(getContext().getFilesDir(), "conversations.json");
                if (chats.exists()) {
                    try (FileInputStream input = new FileInputStream(chats); ByteArrayOutputStream output = new ByteArrayOutputStream()) {
                        byte[] buffer = new byte[8192]; int count;
                        while ((count = input.read(buffer)) != -1) output.write(buffer, 0, count);
                        result.put("chats", new String(output.toByteArray(), StandardCharsets.UTF_8));
                    }
                }
                result.put("platform", "android");
            }
            call.resolve(result);
        } catch (Exception error) { call.reject("Could not read the saved native archive", error); }
    }
}
