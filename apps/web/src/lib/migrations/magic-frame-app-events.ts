import type { EventPropertyRecord, PlatformSource } from "@/lib/metadata/metadata-store";

type MagicFrameAppEventSource = "firebase_analytics" | "server_push_api";

export type MagicFrameAppEventInventory = {
  project: {
    slug: string;
    name: string;
    description: string;
    platforms: PlatformSource[];
  };
  environments: MagicFrameAppEnvironment[];
  events: MagicFrameAppEventDefinition[];
};

export type MagicFrameAppEnvironment = {
  name: "test" | "develop" | "production";
};

export type MagicFrameAppEventDefinition = {
  name: string;
  displayName: string;
  description: string;
  triggerTiming: string;
  module: string;
  platforms: PlatformSource[];
  status: "released";
  source: MagicFrameAppEventSource;
  sourceFile: string;
  properties: EventPropertyRecord[];
};

export type MagicFrameAppInventoryValidation = {
  eventCount: number;
  propertyCount: number;
  serverEventCount: number;
};

const firebaseEventGroupsSource = `
Frame 首页相关|frame_enter,magic_enter,template_exposure,live_moments_template_click,coming_soon_template_click
通用模板组点击事件|template_group_click,bottom_tab_click
模板详情页|template_detail_page_view,template_detail_back,template_detail_select_photo_click
系统相册页|system_album_page_view,system_album_photo_click,system_album_switch,system_album_scan_click,system_album_close
裁剪页面|crop_page_view,crop_page_close,crop_page_save_click,crop_page_rotate_click
上传页面|upload_page_view,upload_page_exit
审核页面|review_page_view,review_page_exit,review_page_invalid_image
图片不过审页面|invalid_image_page_view,invalid_image_page_back,invalid_image_upload_new_click,invalid_image_examples_click
生成中页面|generating_page_view,generating_page_back,generating_page_hide_click,generating_page_insufficient_coins,generating_page_close_coins,generating_page_get_coins
生成成功页面|generate_success_page_view,generate_success_maybe_later,generate_success_check_now,generate_success_back
生成失败页面|generate_fail_page_view,generate_fail_remove_click,generate_fail_back
扫描操作页|scan_operation_page_view,scan_operation_save,scan_operation_cancel,scan_operation_album_switch,scan_operation_retake
扫描结果页|scan_result_page_view,scan_result_photo_click,scan_result_close_click,scan_result_album_select_click,scan_result_retake_click
积分页面|credits_detail_page_close
Creation 浮窗|creation_float_page_view
Creation list|creation_list_trigger,creation_list_page_view
结果页（任务级）|result_page_select_frame,result_page_send_frame,result_page_delete_task,result_page_back
结果页（单动作）- 进行中|action_in_progress_page_view,action_in_progress_back_click,action_in_progress_switch
结果页（单动作）- 成功|action_success_page_view,action_play_click,action_like_click,action_dislike_click,action_delete_click,action_retry_click,result_page_popup_open,result_page_popup_option_select,result_page_popup_text_input,result_page_popup_complete,result_page_popup_close,action_success_back_click,action_success_switch
结果页（单动作）- 失败|action_fail_page_view,action_fail_back_click,action_fail_switch
结果页（单动作）- 待解锁|action_unlock_action_trigger,action_unlock_back_click,action_unlock_switch,action_unlock_button_click,action_unlock_insufficient_coins,action_unlock_close_popup,action_unlock_to_credits_page
AI 引导 Quick tour|ai_guide_popup_exposure,ai_guide_popup_click,ai_guide_popup_close,ai_guide_page_view,ai_guide_page_close,ai_guide_page_get_started,ai_guide_popup_question_click
权益了解与领取|benefit_intro_question_click,benefit_intro_popup_page_view,benefit_intro_popup_close,benefit_card_scan_click,benefit_redeem_popup_page_view,benefit_redeem_now_click,benefit_redeem_maybe_later,benefit_redeem_close_click
积分购买|credits_detail_page_view,credits_package_exposure,credits_package_switch,credits_detail_page_get_click,credits_policy_link_click,credits_transaction_history_click,credits_detail_page_back,credits_get_now_click
用户账号信息浏览与编辑|account_page_view,account_page_edit_click,account_edit_username_click,account_username_save_click,account_birthday_click,account_delete_click,account_page_back,account_delete_confirm_view,account_delete_email_enter,account_delete_confirm_back,account_delete_confirm_delete_click,account_help_page_view,account_privacy_policy_click,account_terms_service_click,account_help_page_back,account_marketing_email_shut,account_marketing_email_open,account_logout_popup,account_logout_cancel_click,account_logout_confirm_click
传图中间页|choose_photo_page_view,choose_photo_new_click,choose_photo_scan_click,choose_photo_google_click,choose_photo_frame_switch,choose_photo_photo_click,choose_photo_close
推送通知|push_show,push_click
活动落地页|activity_enter,activity_action,activity_exit,activity_convert
加入相框|join_frame_scan_click
Magic Banner 相关|magic_banner_show,magic_banner_item_impression,magic_banner_auto_switch,magic_banner_swipe,magic_banner_click,magic_banner_webview_open,magic_banner_webview_close,magic_banner_webview_error,magic_banner_external_browser_open,magic_banner_external_browser_error,magic_banner_page_enter,magic_banner_page_error
Help & Support 联系与社媒|help_support_page_viewed,help_support_contact_tapped,help_support_social_tapped,help_support_link_error
图片上传性能监控|frame_upload_batch,frame_upload_image,frame_upload_video
详情页加载性能监控|detail_page_load_image,detail_page_load_video,detail_page_load_AIMoment
Creation 结果页性能监控|creation_action_view_video,creation_action_view_image
`;

const firebaseSourceFile =
  "magic_frame_app/lib/common/firebase_lib/tracking_events.dart";

const serverSourceFile =
  "magic_frame_app/lib/app/service/fcm/fcm_message_handler.dart";

function buildFirebaseEvents(): MagicFrameAppEventDefinition[] {
  return firebaseEventGroupsSource
    .trim()
    .split("\n")
    .flatMap((line) => {
      const [module, events] = line.split("|");

      return events.split(",").map((eventName) => ({
        name: eventName,
        displayName: eventName,
        description: `从 Magic Frame App Firebase Analytics 事件常量迁移：${eventName}`,
        triggerTiming: "见 Flutter 端 Tracker.track 调用点和迁移指南。",
        module,
        platforms: ["flutter"] satisfies PlatformSource[],
        status: "released" as const,
        source: "firebase_analytics" as const,
        sourceFile: firebaseSourceFile,
        properties: [],
      }));
    });
}

const serverPushEvents: MagicFrameAppEventDefinition[] = [
  {
    name: "open",
    displayName: "推送打开",
    description: "从 Magic Frame App 服务端推送事件接口迁移：用户打开推送。",
    triggerTiming: "FCM 通知被用户打开时，由客户端调用服务端推送事件接口。",
    module: "推送服务端上报",
    platforms: ["flutter"],
    status: "released",
    source: "server_push_api",
    sourceFile: serverSourceFile,
    properties: [
      {
        name: "scene",
        type: "string",
        required: false,
        description: "推送消息 type 或业务场景。",
        exampleValue: "marketing_campaign",
      },
      {
        name: "target_page",
        type: "string",
        required: false,
        description: "推送落地页、外部 URL 或路由。",
        exampleValue: "/activity/spring_sale",
      },
    ],
  },
  {
    name: "click",
    displayName: "推送点击",
    description: "从 Magic Frame App 服务端推送事件接口迁移：用户点击推送。",
    triggerTiming: "FCM 通知点击回调触发时，由客户端调用服务端推送事件接口。",
    module: "推送服务端上报",
    platforms: ["flutter"],
    status: "released",
    source: "server_push_api",
    sourceFile: serverSourceFile,
    properties: [
      {
        name: "scene",
        type: "string",
        required: false,
        description: "推送消息 type 或业务场景。",
        exampleValue: "survey",
      },
      {
        name: "target_page",
        type: "string",
        required: false,
        description: "推送落地页、外部 URL 或路由。",
        exampleValue: "/settings",
      },
    ],
  },
  {
    name: "get_fcm_token_fail",
    displayName: "FCM Token 获取失败",
    description: "从 Magic Frame App 服务端推送事件接口迁移：记录 FCM Token 获取失败。",
    triggerTiming: "获取 FCM Token 抛错时，由客户端调用服务端推送事件接口。",
    module: "推送服务端上报",
    platforms: ["flutter"],
    status: "released",
    source: "server_push_api",
    sourceFile: "magic_frame_app/lib/app/service/fcm/fcm_service.dart",
    properties: [
      {
        name: "reason",
        type: "string",
        required: false,
        description: "Token 获取失败原因。",
        exampleValue: "permission_denied",
      },
    ],
  },
];

export const magicFrameAppEventInventory: MagicFrameAppEventInventory = {
  project: {
    slug: "magic_frame_app",
    name: "Magic Frame App",
    description:
      "由 Magic Frame App Firebase Analytics 与服务端推送事件迁移而来的第一个正式 TrackingHub 项目。",
    platforms: ["flutter"],
  },
  environments: [
    { name: "test" },
    { name: "develop" },
    { name: "production" },
  ],
  events: [...buildFirebaseEvents(), ...serverPushEvents],
};

export function validateMagicFrameAppEventInventory(
  inventory: MagicFrameAppEventInventory,
): MagicFrameAppInventoryValidation {
  const seen = new Set<string>();

  for (const event of inventory.events) {
    if (!event.name.trim()) {
      throw new Error("Magic Frame App event name cannot be empty");
    }

    if (!/^[A-Za-z0-9_]+$/.test(event.name)) {
      throw new Error(`Invalid Magic Frame App event name: ${event.name}`);
    }

    if (seen.has(event.name)) {
      throw new Error(`Duplicate Magic Frame App event name: ${event.name}`);
    }
    seen.add(event.name);

    for (const property of event.properties) {
      if (!property.name.trim()) {
        throw new Error(`Event ${event.name} has an empty property name`);
      }
    }
  }

  return {
    eventCount: inventory.events.length,
    propertyCount: inventory.events.reduce(
      (total, event) => total + event.properties.length,
      0,
    ),
    serverEventCount: inventory.events.filter(
      (event) => event.source === "server_push_api",
    ).length,
  };
}
