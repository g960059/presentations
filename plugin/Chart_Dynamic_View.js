//-----------------------------------------------------------
//canvas.jsを使い可視表示な場所にスクロールしたら自動読み込み
//-----------------------------------------------------------
$(function() {
	// デフォルト変数
	var chart_i   = 0;
	var chart_ii  = 0;
	canvas_object = [];
	// オブジェクト生成
	$('.canvas_chart').each(function() {
		canvas_object[chart_ii] = {id:$(this).attr('id'), key: 0};
		chart_ii++;
	});
	$(window).scroll(function() {
		$('.canvas_chart').each(function() {
			var this_canvas        = $(this);
			var this_canvas_offset = this_canvas.offset();
			var this_gnition_point = (this_canvas_offset.top - $(window).height());
			var this_emporary_id   = this_canvas.attr('id');
			var chart_check_id     = this_canvas.attr('chart_check');
			// 可視の場所に来たら
			if($(window).scrollTop() > this_gnition_point) {
				// まだチャートを表示していない場合
				if(chart_check_id != 'TRUE') {
					chart_i++;
					this_canvas.attr('chart_check', 'TRUE');
					this_canvas.attr('id', this_emporary_id + '_' + chart_i);
					// 外部チャート読み込み
					$('#' + this_emporary_id + '_' + chart_i).load(this_emporary_id + '.html', function() {
						$('#' + this_emporary_id).css('opacity','0');
						$('#' + this_emporary_id).animate({opacity: '1'}, 1500);
					}); // $('#' + this_emporary_id + '_' + chart_i).load(this_emporary_id + '.html', function() {
				} // if(f_id != 'TRUE') {
			} // if($(window).scrollTop() > this_gnition_point) {
		}); // $('.canvas_chart').each(function() {
	}); // $(window).scroll(function() {
}); // $(function() {