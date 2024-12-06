import Head from "next/head";
import { zsQ } from '@components/main';

export default () => {
    return (<>
        <Head>
            <title>{`更新日志 | ${zsQ.title}`}</title>
        </Head>
        <span id="tagid">updatelogs</span>
            <div className="updatelogs">
                <h1 className="display-5 mb-5">更新日志</h1>



                <h3>BETA 5
                    <p>2024-12-07 黎明</p>
                </h3>
                <p>—— 将原 HTML 字符串统一为 JSX ，并将原 JS 逻辑封装为模块，以实现更好的性能。</p>
                <p>—— 根据错误经验，将反骨用户在首页输入的可能存在 www. 开头及连续的 *. 进行过滤以降低错误率。</p>



                <h3>BETA 4
                    <p>2024-12-04 上午</p>
                </h3>
                <p>—— 新增 “证书管理” 页面，提供曾经申请的证书保存和到期时间预测。</p>
                <p>—— 修改验证所有权时的输出信息内边距以强化视觉效果。</p>
                <p>—— 使主内容在中等宽度设备上占据全宽，以避免中间出现细条似的主内容。</p>
                <p>—— 优化文档描述，新增 “安装到服务器或 CDN” 段落。</p>
                <p>—— 移除 “自签名证书” 功能及页面。</p>



                <h3>BETA 3
                    <p>2024-11-27 黄昏</p>
                </h3>
                <p>—— 新增 “高级选项” 以简化步骤。</p>
                <p>—— 如果在设置中更新了 ACME 账户私钥，则将立即重新赋值新的账户私钥而无需刷新页面。</p>



                <h3>BETA 2
                    <p>2024-11-23 晚</p>
                </h3>
                <p>—— 合并 “秋の工具箱” 的 “自签名证书” 子功能。</p>



                <h3>BETA 1
                    <p>2024-11-23 黄昏</p>
                </h3>
                <p>—— 提供更详尽的文档来进行参照。</p>
                <p>—— 扩展记忆能力，将 ACME 账户私钥 和 证书私钥 全部自动处理并记忆在本地浏览器。</p>
                <p>—— 新增 “设置” 页面，可以查看、删除及输入 ZSEncrypt 的一切可变需存储数据，并支持导出和导入。</p>
                <p>—— 原是 “秋の工具箱” 的一个子功能，现在将其独立出来称为 “ZSEncrypt” ，单独维护，并提供更强的易用性。</p>





            </div>
    </>)
};